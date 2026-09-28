import { useRef, type PointerEvent } from "react";

export interface Tracing {
  id: number;
  points: [number, number][];
}

interface Props {
  xMax: number;
  xLabel: string;
  xTicks: number[];
  yMax: number;
  yLabel: string;
  /** Finished tracings, drawn dimmer; the live tracing is drawn bright on top. */
  tracings: Tracing[];
  live: [number, number][] | null;
  /** Measure cursor position on the x axis, or null when off. */
  measureX?: number | null;
  onMeasure?: (x: number) => void;
  /** Horizontal reference line (e.g. the load in Activity 7). */
  refLine?: { y: number; label: string } | null;
}

const W = 560;
const H = 300;
const PAD = { l: 46, r: 14, t: 14, b: 40 };
const PW = W - PAD.l - PAD.r;
const PH = H - PAD.t - PAD.b;

function niceStep(max: number): number {
  const raw = max / 5;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

function path(points: [number, number][], xMax: number, yMax: number): string {
  let d = "";
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    const px = PAD.l + (Math.min(x, xMax) / xMax) * PW;
    const py = PAD.t + PH - (Math.min(Math.max(y, 0), yMax) / yMax) * PH;
    d += `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
  }
  return d;
}

/** The force display: a dark screen with a grid, earlier tracings and the live one. */
export function Oscilloscope({ xMax, xLabel, xTicks, yMax, yLabel, tracings, live, measureX, onMeasure, refLine }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const yStep = niceStep(yMax);
  const yTicks: number[] = [];
  for (let y = 0; y <= yMax + 1e-9; y += yStep) yTicks.push(Number(y.toFixed(4)));

  const toX = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const box = svg.getBoundingClientRect();
    const px = ((clientX - box.left) / box.width) * W;
    return Math.min(xMax, Math.max(0, ((px - PAD.l) / PW) * xMax));
  };
  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (measureX == null || !onMeasure) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    onMeasure(toX(e.clientX));
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (dragging.current && onMeasure) onMeasure(toX(e.clientX));
  };
  const stop = () => {
    dragging.current = false;
  };

  const mx = measureX == null ? null : PAD.l + (measureX / xMax) * PW;

  return (
    <svg
      ref={svgRef}
      className={`lab-scope${measureX != null ? " is-measuring" : ""}`}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${yLabel} against ${xLabel}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
    >
      <rect x={PAD.l} y={PAD.t} width={PW} height={PH} className="lab-scope-screen" rx="4" />
      {xTicks.map((x) => {
        const px = PAD.l + (x / xMax) * PW;
        return (
          <g key={`x${x}`}>
            <line x1={px} y1={PAD.t} x2={px} y2={PAD.t + PH} className="lab-scope-grid" />
            <text x={px} y={PAD.t + PH + 15} className="lab-scope-tick" textAnchor="middle">
              {x}
            </text>
          </g>
        );
      })}
      {yTicks.map((y) => {
        const py = PAD.t + PH - (y / yMax) * PH;
        return (
          <g key={`y${y}`}>
            <line x1={PAD.l} y1={py} x2={PAD.l + PW} y2={py} className="lab-scope-grid" />
            <text x={PAD.l - 6} y={py + 4} className="lab-scope-tick" textAnchor="end">
              {y}
            </text>
          </g>
        );
      })}
      <text x={PAD.l + PW / 2} y={H - 6} className="lab-scope-label" textAnchor="middle">
        {xLabel}
      </text>
      <text x={12} y={PAD.t + PH / 2} className="lab-scope-label" textAnchor="middle" transform={`rotate(-90 12 ${PAD.t + PH / 2})`}>
        {yLabel}
      </text>
      {refLine && (
        <g>
          <line
            x1={PAD.l}
            x2={PAD.l + PW}
            y1={PAD.t + PH - (refLine.y / yMax) * PH}
            y2={PAD.t + PH - (refLine.y / yMax) * PH}
            className="lab-scope-ref"
          />
          <text x={PAD.l + PW - 4} y={PAD.t + PH - (refLine.y / yMax) * PH - 5} className="lab-scope-reflabel" textAnchor="end">
            {refLine.label}
          </text>
        </g>
      )}
      <g clipPath="url(#lab-scope-clip)">
        {tracings.map((t) => (
          <path key={t.id} d={path(t.points, xMax, yMax)} className="lab-scope-trace is-old" />
        ))}
        {live && live.length > 1 && <path d={path(live, xMax, yMax)} className="lab-scope-trace" />}
      </g>
      <defs>
        <clipPath id="lab-scope-clip">
          <rect x={PAD.l} y={PAD.t - 2} width={PW} height={PH + 4} />
        </clipPath>
      </defs>
      {mx != null && (
        <g>
          <line x1={mx} x2={mx} y1={PAD.t} y2={PAD.t + PH} className="lab-scope-measure" />
          <rect x={mx - 7} y={PAD.t + PH - 14} width="14" height="14" rx="3" className="lab-scope-measure-handle" />
        </g>
      )}
    </svg>
  );
}
