import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { KnowledgeGraph } from "../../lib/knowledgeGraph/types";

// The knowledge map, drawn on a canvas: concepts as dots (sized by how often they come up,
// colored by subject or mastery), links as hairlines. Drag to pan, wheel or pinch to zoom, tap
// a dot to open it. Labels appear for the bigger concepts first and for more as you zoom in.

export interface NodeStyle {
  fill: string;
  /** Drawn with a ring: the concept is shared across subjects. */
  shared: boolean;
  /** Outline for "needs work" (mastery mode). */
  weak?: boolean;
}

export interface GraphCanvasHandle {
  focusNode: (index: number) => void;
  fit: () => void;
  zoom: (factor: number) => void;
}

interface Props {
  graph: KnowledgeGraph;
  visible: boolean[];
  styleOf: (index: number) => NodeStyle;
  selected: number | null;
  /** Neighbours of the selected node, highlighted with it. */
  highlight: Set<number>;
  /** Dim everything outside the highlight. */
  focus: boolean;
  onSelect: (index: number | null) => void;
  /** Changes whenever colors need re-reading (theme, color mode). */
  paintKey: string;
}

interface View {
  x: number;
  y: number;
  k: number;
}

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export const GraphCanvas = forwardRef<GraphCanvasHandle, Props>(function GraphCanvas(
  { graph, visible, styleOf, selected, highlight, focus, onSelect, paintKey },
  ref,
) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const view = useRef<View>({ x: 0, y: 0, k: 1 });
  const size = useRef({ w: 0, h: 0 });
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);
  const frame = useRef(0);
  const animation = useRef(0);
  // Degree order: which labels show first.
  const rank = useRef<number[]>([]);

  const draw = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const { w, h } = size.current;
    const { x: vx, y: vy, k } = view.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const sx = (x: number) => (x - vx) * k + w / 2;
    const sy = (y: number) => (y - vy) * k + h / 2;
    const line = css("--border-strong") || "#888";
    const accent = css("--accent") || "#2dd4a7";
    const text = css("--text") || "#111";
    const surface = css("--surface-solid") || "#fff";
    const lit = (i: number) => !focus || highlight.size === 0 || highlight.has(i);

    // Links: hairlines, the selected node's in the accent.
    ctx.lineWidth = 1;
    for (const e of graph.edges) {
      if (!visible[e.s] || !visible[e.t]) continue;
      const on = selected !== null && (e.s === selected || e.t === selected);
      if (focus && highlight.size && !(highlight.has(e.s) && highlight.has(e.t))) continue;
      ctx.strokeStyle = on ? accent : line;
      ctx.globalAlpha = on ? 0.9 : Math.min(0.5, 0.12 + e.w * 0.02);
      ctx.lineWidth = on ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(sx(graph.nodes[e.s].x), sy(graph.nodes[e.s].y));
      ctx.lineTo(sx(graph.nodes[e.t].x), sy(graph.nodes[e.t].y));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Dots, with a surface ring so they stay apart where they overlap.
    const radius = (i: number) => Math.max(2.2, graph.nodes[i].r * Math.min(1.6, Math.sqrt(k)));
    graph.nodes.forEach((n, i) => {
      if (!visible[i]) return;
      const st = styleOf(i);
      const r = radius(i);
      ctx.globalAlpha = lit(i) ? 1 : 0.14;
      ctx.beginPath();
      ctx.arc(sx(n.x), sy(n.y), r, 0, Math.PI * 2);
      ctx.fillStyle = st.fill;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = surface;
      ctx.stroke();
      if (st.shared || st.weak) {
        ctx.beginPath();
        ctx.arc(sx(n.x), sy(n.y), r + 3, 0, Math.PI * 2);
        ctx.lineWidth = st.weak ? 2 : 1.4;
        ctx.setLineDash(st.weak ? [] : [2.5, 2]);
        ctx.strokeStyle = st.weak ? css("--red") || "#e34948" : text;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
    if (selected !== null && visible[selected]) {
      const n = graph.nodes[selected];
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(sx(n.x), sy(n.y), radius(selected) + 6, 0, Math.PI * 2);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = accent;
      ctx.stroke();
    }

    // Labels: the biggest concepts at any zoom, more as you zoom in; never colliding.
    ctx.font = `600 12px ${css("--font-body") || "system-ui"}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const shown = Math.round(Math.min(graph.nodes.length, 18 * k * k + 10));
    const taken: { x: number; y: number; w: number }[] = [];
    const order = [...(selected !== null ? [selected] : []), ...highlight, ...rank.current.slice(0, shown)];
    const done = new Set<number>();
    for (const i of order) {
      if (done.has(i) || !visible[i] || !lit(i)) continue;
      done.add(i);
      const n = graph.nodes[i];
      const x = sx(n.x);
      const y = sy(n.y) + radius(i) + 4;
      if (x < -60 || x > w + 60 || y < -20 || y > h + 20) continue;
      const tw = ctx.measureText(n.label).width;
      const force = i === selected || highlight.has(i);
      if (!force && taken.some((t) => Math.abs(t.x - x) < (t.w + tw) / 2 + 4 && Math.abs(t.y - y) < 15)) continue;
      taken.push({ x, y, w: tw });
      ctx.globalAlpha = 1;
      ctx.lineWidth = 3;
      ctx.strokeStyle = surface;
      ctx.strokeText(n.label, x, y);
      ctx.fillStyle = text;
      ctx.fillText(n.label, x, y);
    }
    ctx.globalAlpha = 1;
  }, [graph, visible, styleOf, selected, highlight, focus]);

  const schedule = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(draw);
  }, [draw]);

  const bounds = useCallback(
    (only?: number[]) => {
      const idx = only ?? graph.nodes.map((_, i) => i).filter((i) => visible[i]);
      if (idx.length === 0) return { x: 0, y: 0, k: 1 };
      let x0 = Infinity;
      let x1 = -Infinity;
      let y0 = Infinity;
      let y1 = -Infinity;
      for (const i of idx) {
        const n = graph.nodes[i];
        x0 = Math.min(x0, n.x);
        x1 = Math.max(x1, n.x);
        y0 = Math.min(y0, n.y);
        y1 = Math.max(y1, n.y);
      }
      const { w, h } = size.current;
      const k = Math.min(4, Math.max(0.15, Math.min(w / (x1 - x0 + 120), h / (y1 - y0 + 120))));
      return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, k };
    },
    [graph, visible],
  );

  const animateTo = useCallback(
    (to: View) => {
      cancelAnimationFrame(animation.current);
      const from = { ...view.current };
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const start = performance.now();
      const step = (t: number) => {
        const p = reduce ? 1 : Math.min(1, (t - start) / 450);
        const e = 1 - (1 - p) ** 3;
        view.current = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, k: from.k * (to.k / from.k) ** e };
        draw();
        if (p < 1) animation.current = requestAnimationFrame(step);
      };
      animation.current = requestAnimationFrame(step);
    },
    [draw],
  );

  useImperativeHandle(
    ref,
    () => ({
      focusNode: (i: number) => {
        const near = [i, ...graph.edges.filter((e) => e.s === i || e.t === i).map((e) => (e.s === i ? e.t : e.s))];
        const b = bounds(near);
        animateTo({ x: graph.nodes[i].x, y: graph.nodes[i].y, k: Math.max(1.2, Math.min(2.4, b.k)) });
      },
      fit: () => { animateTo(bounds()); },
      zoom: (f: number) => { animateTo({ ...view.current, k: Math.min(6, Math.max(0.12, view.current.k * f)) }); },
    }),
    [graph, bounds, animateTo],
  );

  useEffect(() => {
    const deg = new Array(graph.nodes.length).fill(0);
    for (const e of graph.edges) {
      deg[e.s] += e.w;
      deg[e.t] += e.w;
    }
    rank.current = graph.nodes.map((_, i) => i).sort((a, b) => graph.nodes[b].mentions + deg[b] - (graph.nodes[a].mentions + deg[a]));
  }, [graph]);

  // Size the canvas to its box (and the screen's pixel density); fit the map the first time.
  const fitted = useRef(false);
  useEffect(() => {
    const el = wrap.current;
    const c = canvas.current;
    if (!el || !c) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      size.current = { w: el.clientWidth, h: el.clientHeight };
      c.width = Math.round(el.clientWidth * dpr);
      c.height = Math.round(el.clientHeight * dpr);
      if (!fitted.current && el.clientWidth > 0) {
        view.current = bounds();
        fitted.current = true;
      }
      draw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    return () => { ro.disconnect(); };
  }, [bounds, draw]);

  useEffect(schedule, [schedule, paintKey]);

  // Wheel zoom, around the pointer. A native listener, so the page doesn't scroll as well.
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const box = c.getBoundingClientRect();
      const px = e.clientX - box.left;
      const py = e.clientY - box.top;
      const { w, h } = size.current;
      const v = view.current;
      const k = Math.min(6, Math.max(0.12, v.k * Math.exp(-e.deltaY * 0.0015)));
      const wx = (px - w / 2) / v.k + v.x;
      const wy = (py - h / 2) / v.k + v.y;
      view.current = { k, x: wx - (px - w / 2) / k, y: wy - (py - h / 2) / k };
      schedule();
    };
    c.addEventListener("wheel", onWheel, { passive: false });
    return () => { c.removeEventListener("wheel", onWheel); };
  }, [schedule]);

  // Pointer: drag to pan, pinch to zoom, tap to select, hover for a name.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(0);
  const pinch = useRef<{ d: number; k: number } | null>(null);

  const hit = (px: number, py: number): number | null => {
    const { w, h } = size.current;
    const { x: vx, y: vy, k } = view.current;
    let best: number | null = null;
    let bestD = Infinity;
    graph.nodes.forEach((n, i) => {
      if (!visible[i]) return;
      const dx = (n.x - vx) * k + w / 2 - px;
      const dy = (n.y - vy) * k + h / 2 - py;
      const d = Math.hypot(dx, dy);
      const r = Math.max(2.2, n.r * Math.min(1.6, Math.sqrt(k))) + 8;
      if (d < r && d < bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
  };

  const local = (e: { clientX: number; clientY: number }) => {
    const box = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  };

  return (
    <div className="map-canvas-wrap" ref={wrap}>
      <canvas
        ref={canvas}
        className="map-canvas"
        role="img"
        aria-label="Knowledge map. Use the search box or the list view to explore it with a keyboard or screen reader."
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          pointers.current.set(e.pointerId, local(e));
          moved.current = 0;
          if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), k: view.current.k };
          }
        }}
        onPointerMove={(e) => {
          const p = local(e);
          const prev = pointers.current.get(e.pointerId);
          if (!prev) {
            const i = hit(p.x, p.y);
            setHover(i === null ? null : { i, x: p.x, y: p.y });
            e.currentTarget.style.cursor = i === null ? "grab" : "pointer";
            return;
          }
          pointers.current.set(e.pointerId, p);
          if (pointers.current.size === 2 && pinch.current) {
            const [a, b] = [...pointers.current.values()];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            view.current.k = Math.min(6, Math.max(0.12, pinch.current.k * (d / pinch.current.d)));
            moved.current += 10;
          } else {
            const dx = p.x - prev.x;
            const dy = p.y - prev.y;
            moved.current += Math.abs(dx) + Math.abs(dy);
            view.current.x -= dx / view.current.k;
            view.current.y -= dy / view.current.k;
          }
          setHover(null);
          schedule();
        }}
        onPointerUp={(e) => {
          const p = local(e);
          pointers.current.delete(e.pointerId);
          if (pointers.current.size < 2) pinch.current = null;
          if (moved.current < 6 && pointers.current.size === 0) onSelect(hit(p.x, p.y));
        }}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          pinch.current = null;
        }}
        onPointerLeave={() => { setHover(null); }}
      />
      {hover && hover.i !== selected && (
        <div className="map-hover" style={{ left: hover.x, top: hover.y }}>
          {graph.nodes[hover.i].label}
        </div>
      )}
    </div>
  );
});
