import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { GraphCanvas, type GraphCanvasHandle, type NodeStyle } from "../components/map/GraphCanvas";
import { AlfondIcon } from "../components/icons";
import { useAccount } from "../hooks/useAccount";
import { askAlfondAbout } from "../lib/alfond";
import { ebookMeta, flashcardDecks, quizBanks } from "../lib/content";
import { nodeMastery, readStudyState } from "../lib/knowledgeGraph/mastery";
import { GRAPH_URL, type GraphNode, type KnowledgeGraph } from "../lib/knowledgeGraph/types";
import { allSubjects } from "../lib/routeMeta";
import { STORAGE_UPDATED_EVENT } from "../lib/sync";

type ColorMode = "subject" | "mastery";

/** The map's subject colors, in fixed order (validated palette slots, see map.css). */
const SLOTS = 6;

const subjectName = (key: string) => key.split("/")[1] ?? key;
const blockOf = (key: string) => key.split("/")[0] ?? "";

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** From the surface toward the accent as mastery grows (sequential, one hue). */
function masteryColor(m: number, accent: string, surface: string): string {
  const a = hexToRgb(accent);
  const s = hexToRgb(surface);
  if (!a || !s) return accent;
  const t = 0.3 + 0.7 * m;
  const c = a.map((v, i) => {
    const from = s.at(i) ?? v;
    return Math.round(from + (v - from) * t);
  });
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

const percent = (m: number | null) => (m === null ? "—" : `${Math.round(m * 100)}%`);

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Repaints when the theme changes (the toggle or the system setting). */
function useThemeKey(): string {
  const [key, setKey] = useState(0);
  useEffect(() => {
    const bump = () => { setKey((k) => k + 1); };
    const mo = new MutationObserver(bump);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", bump);
    return () => {
      mo.disconnect();
      mq.removeEventListener("change", bump);
    };
  }, []);
  return String(key);
}

export function KnowledgeMap() {
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    fetch(GRAPH_URL)
      .then((r) => (r.ok ? (r.json() as Promise<KnowledgeGraph>) : Promise.reject(new Error(String(r.status)))))
      .then((g) => {
        if (live) setGraph(g);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <section className="page map-page">
      <h1>Knowledge map</h1>
      <p className="subtitle">
        Every concept across all your blocks and subjects, linked where they're taught together. Shared concepts join the subjects; tap one to open its material.
      </p>
      {graph ? <MapView graph={graph} /> : <p className="map-loading">{failed ? "The map couldn't be loaded. Check your connection and reload." : "Loading the map…"}</p>}
    </section>
  );
}

function MapView({ graph }: { graph: KnowledgeGraph }) {
  const { config } = useAccount();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const canvas = useRef<GraphCanvasHandle>(null);
  const themeKey = useThemeKey();
  const subjects = useMemo(() => allSubjects(), []);
  const subjectLabel = (key: string) => subjects.find((s) => s.key === key)?.label ?? subjectName(key);

  const names = useMemo(() => [...new Set(graph.nodes.flatMap((n) => n.subjects.map(subjectName)))].sort(), [graph]);
  const blocks = useMemo(() => [...new Set(graph.nodes.flatMap((n) => n.subjects.map(blockOf)))].sort(), [graph]);
  const allKeys = useMemo(() => [...new Set(graph.nodes.flatMap((n) => n.subjects))].sort(), [graph]);

  const [mode, setMode] = useState<ColorMode>("subject");
  const [blockFilter, setBlockFilter] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState<string | null>(null);
  const [bridgesOnly, setBridgesOnly] = useState(false);
  const [focus, setFocus] = useState(false);
  const [view, setView] = useState<"map" | "list">("map");
  const [query, setQuery] = useState("");
  const [version, setVersion] = useState(0);

  // The selected concept lives in the address (?c=…), so it can be shared and Back works.
  const selected = useMemo(() => {
    const id = params.get("c");
    const i = id ? graph.nodes.findIndex((n) => n.id === id) : -1;
    return i >= 0 ? i : null;
  }, [params, graph]);
  const selectedNode = selected === null ? undefined : graph.nodes.at(selected);
  const select = (i: number | null) => {
    const next = new URLSearchParams(params);
    const id = i === null ? undefined : graph.nodes.at(i)?.id;
    if (id) next.set("c", id);
    else next.delete("c");
    setParams(next, { replace: i !== null && selected !== null });
  };

  useEffect(() => {
    const bump = () => { setVersion((v) => v + 1); };
    window.addEventListener(STORAGE_UPDATED_EVENT, bump);
    return () => { window.removeEventListener(STORAGE_UPDATED_EVENT, bump); };
  }, []);
  const mastery = useMemo(() => {
    const state = readStudyState(allKeys);
    return graph.nodes.map((n) => nodeMastery(n, state));
    // version: re-read after a sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, allKeys, version]);

  const neighbours = useMemo(() => {
    const out: Map<number, { i: number; w: number; rel?: string }[]> = new Map();
    for (const e of graph.edges) {
      const sourceEdges = out.get(e.s) ?? [];
      sourceEdges.push({ i: e.t, w: e.w, rel: e.rel });
      out.set(e.s, sourceEdges);
      const targetEdges = out.get(e.t) ?? [];
      targetEdges.push({ i: e.s, w: e.w, rel: e.rel });
      out.set(e.t, targetEdges);
    }
    for (const list of out.values()) list.sort((a, b) => b.w - a.w);
    return out;
  }, [graph]);

  const shared = useMemo(() => graph.nodes.map((n) => new Set(n.subjects.map(subjectName)).size > 1 || new Set(n.subjects.map(blockOf)).size > 1), [graph]);

  const visible = useMemo(
    () =>
      graph.nodes.map((n, i) => {
        if (blockFilter && !n.subjects.some((s) => blockOf(s) === blockFilter)) return false;
        if (nameFilter && !n.subjects.some((s) => subjectName(s) === nameFilter)) return false;
        if (bridgesOnly && !shared.at(i) && i !== selected) return false;
        return true;
      }),
    [graph, blockFilter, nameFilter, bridgesOnly, shared, selected],
  );

  const highlight = useMemo(() => (selected === null ? new Set<number>() : new Set([selected, ...(neighbours.get(selected) ?? []).map((n) => n.i)])), [selected, neighbours]);

  const styleOf = useMemo(() => {
    const colors = Array.from({ length: SLOTS }, (_, i) => cssVar(`--map-${i + 1}`) || "#888");
    const accent = cssVar("--accent");
    const surface = cssVar("--surface-solid");
    const unstudied = cssVar("--map-unstudied") || "#999";
    return (i: number): NodeStyle => {
      if (mode === "mastery") {
        const m = mastery.at(i) ?? null;
        return { fill: m === null ? unstudied : masteryColor(m, accent, surface), shared: false, weak: m !== null && m < 0.5 };
      }
      const slot = names.indexOf(subjectName(graph.nodes.at(i)?.subjects[0] ?? ""));
      return { fill: colors.at(Math.max(0, slot) % SLOTS) ?? unstudied, shared: shared.at(i) ?? false };
    };
    // themeKey: re-read the colors when the theme changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, mode, mastery, names, shared, themeKey]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return graph.nodes
      .map((n, i) => ({ n, i, at: n.label.toLowerCase().indexOf(q) }))
      .filter((r) => r.at >= 0)
      .sort((a, b) => a.at - b.at || b.n.mentions - a.n.mentions)
      .slice(0, 8);
  }, [query, graph]);

  const openNode = (i: number) => {
    select(i);
    setQuery("");
    if (view === "map") canvas.current?.focusNode(i);
  };

  // Opening a shared link (?c=…) centres the map on that concept.
  const centred = useRef(false);
  useEffect(() => {
    if (centred.current || selected === null) return;
    centred.current = true;
    const t = setTimeout(() => canvas.current?.focusNode(selected), 60);
    return () => { clearTimeout(t); };
  }, [selected]);

  const visibleCount = visible.filter(Boolean).length;
  const bridges = useMemo(
    () =>
      graph.nodes
        .map((n, i) => ({ n, i }))
        .filter(({ i }) => shared.at(i) && visible.at(i))
        .sort((a, b) => b.n.subjects.length - a.n.subjects.length || b.n.mentions - a.n.mentions)
        .slice(0, 10),
    [graph, shared, visible],
  );

  return (
    <div className="map-layout">
      <div className="map-toolbar">
        <div className="map-search">
          <input
            type="search"
            className="form-input"
            placeholder="Find a concept…"
            aria-label="Find a concept on the map"
            value={query}
            onChange={(e) => { setQuery(e.target.value); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) openNode(results[0].i);
            }}
          />
          {results.length > 0 && (
            <ul className="map-search-results" role="listbox" aria-label="Matching concepts">
              {results.map((r) => (
                <li key={r.i}>
                  <button type="button" role="option" aria-selected={false} onClick={() => { openNode(r.i); }}>
                    <span>{r.n.label}</span>
                    <small>{[...new Set(r.n.subjects.map((s) => subjectLabel(s)))].join(", ")}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="map-chips" role="group" aria-label="Block">
          <button type="button" className={blockFilter === null ? "map-chip active" : "map-chip"} aria-pressed={blockFilter === null} onClick={() => { setBlockFilter(null); }}>
            All blocks
          </button>
          {blocks.map((b) => (
            <button key={b} type="button" className={blockFilter === b ? "map-chip active" : "map-chip"} aria-pressed={blockFilter === b} onClick={() => { setBlockFilter(blockFilter === b ? null : b); }}>
              Block {b}
            </button>
          ))}
        </div>
        <div className="map-chips" role="group" aria-label="Subject">
          {names.map((name, i) => (
            <button key={name} type="button" className={nameFilter === name ? "map-chip active" : "map-chip"} aria-pressed={nameFilter === name} onClick={() => { setNameFilter(nameFilter === name ? null : name); }}>
              <span className="map-swatch" style={{ background: `var(--map-${(i % SLOTS) + 1})` }} aria-hidden="true" />
              {subjects.find((s) => s.id === name)?.label ?? name}
            </button>
          ))}
        </div>
        <div className="map-chips" role="group" aria-label="Display">
          <button type="button" className={mode === "subject" ? "map-chip active" : "map-chip"} aria-pressed={mode === "subject"} onClick={() => { setMode("subject"); }}>
            Color by subject
          </button>
          <button type="button" className={mode === "mastery" ? "map-chip active" : "map-chip"} aria-pressed={mode === "mastery"} onClick={() => { setMode("mastery"); }}>
            Color by my mastery
          </button>
          <button type="button" className={bridgesOnly ? "map-chip active" : "map-chip"} aria-pressed={bridgesOnly} onClick={() => { setBridgesOnly((b) => !b); }}>
            Only links between subjects
          </button>
          <button type="button" className={view === "list" ? "map-chip active" : "map-chip"} aria-pressed={view === "list"} onClick={() => { setView(view === "map" ? "list" : "map"); }}>
            {view === "map" ? "List view" : "Map view"}
          </button>
        </div>
      </div>

      <div className="map-legend" aria-label="Legend">
        {mode === "subject" ? (
          <>
            {names.map((name, i) => (
              <span key={name}>
                <span className="map-swatch" style={{ background: `var(--map-${(i % SLOTS) + 1})` }} aria-hidden="true" />
                {subjects.find((s) => s.id === name)?.label ?? name}
              </span>
            ))}
            <span>
              <span className="map-swatch map-swatch-ring" aria-hidden="true" />
              Shared across subjects or blocks
            </span>
          </>
        ) : (
          <>
            <span>
              <span className="map-ramp" aria-hidden="true" />
              Weaker → stronger
            </span>
            <span>
              <span className="map-swatch map-swatch-weak" aria-hidden="true" />
              Needs work (under 50%)
            </span>
            <span>
              <span className="map-swatch" style={{ background: "var(--map-unstudied)" }} aria-hidden="true" />
              Not studied yet
            </span>
          </>
        )}
        <span className="map-count">
          {visibleCount} concepts · {graph.edges.filter((e) => visible[e.s] && visible[e.t]).length} links
        </span>
      </div>

      <div className="map-main">
        {view === "map" ? (
          <div className="map-stage">
            <GraphCanvas
              ref={canvas}
              graph={graph}
              visible={visible}
              styleOf={styleOf}
              selected={selected}
              highlight={highlight}
              focus={focus}
              onSelect={(i) => { select(i); }}
              paintKey={`${themeKey}|${mode}|${version}`}
            />
            <div className="map-zoom">
              <button type="button" className="icon-btn" onClick={() => canvas.current?.zoom(1.4)} aria-label="Zoom in">
                +
              </button>
              <button type="button" className="icon-btn" onClick={() => canvas.current?.zoom(1 / 1.4)} aria-label="Zoom out">
                −
              </button>
              <button type="button" className="icon-btn" onClick={() => canvas.current?.fit()} aria-label="Show the whole map">
                ⤢
              </button>
            </div>
          </div>
        ) : (
          <ConceptList graph={graph} visible={visible} mastery={mastery} neighbours={neighbours} shared={shared} subjectLabel={subjectLabel} onOpen={(i) => { select(i); }} selected={selected} />
        )}

        <aside className="map-panel" aria-live="polite">
          {selected === null || !selectedNode ? (
            <div className="map-panel-intro">
              <h2>Concepts that connect subjects</h2>
              <p>These come up in more than one subject or block. Tap one, or any dot on the map, to see what it links to and where to study it.</p>
              <ul className="map-bridge-list">
                {bridges.map(({ n, i }) => (
                  <li key={i}>
                    <button type="button" onClick={() => { openNode(i); }}>
                      {n.label}
                      <small>{[...new Set(n.subjects.map((s) => subjectLabel(s)))].join(" · ")}</small>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ConceptPanel
              node={selectedNode}
              mastery={mastery.at(selected) ?? null}
              links={(neighbours.get(selected) ?? []).slice(0, 14)}
              graph={graph}
              subjectLabel={subjectLabel}
              focus={focus}
              onFocus={() => { setFocus((f) => !f); }}
              onOpen={openNode}
              onClose={() => { select(null); }}
              aiOn={config?.ai === true}
              onAsk={(q) => { askAlfondAbout(q, () => navigate("/alfond")); }}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

function ConceptPanel({
  node,
  mastery,
  links,
  graph,
  subjectLabel,
  focus,
  onFocus,
  onOpen,
  onClose,
  aiOn,
  onAsk,
}: {
  node: GraphNode;
  mastery: number | null;
  links: { i: number; w: number; rel?: string }[];
  graph: KnowledgeGraph;
  subjectLabel: (key: string) => string;
  focus: boolean;
  onFocus: () => void;
  onOpen: (i: number) => void;
  onClose: () => void;
  aiOn: boolean;
  onAsk: (question: string) => void;
}) {
  const sectionLink = (c: string, a: string) => (c.startsWith("summary:") ? `/summaries/${c.slice(8)}#${a}` : `/ebooks/${c}#${a}`);
  const sectionTitle = (c: string) => {
    if (c.startsWith("summary:")) return `${subjectLabel(c.slice(8))} summary`;
    const [b, s, ch] = c.split("/");
    return ebookMeta.get(`${b}/${s}`)?.chapters.find((x) => x.id === ch)?.title ?? ch;
  };
  const withBlock = (key: string) => `${subjectLabel(key)} ${key.split("/")[0]}`;
  const sections = node.sections.filter((s, i) => node.sections.findIndex((t) => t.c === s.c && t.a === s.a) === i);
  const cardEntries = Object.entries(node.cards);
  const questionEntries = Object.entries(node.questions);
  const labelEntries = Object.entries(node.labels);
  const neighbourNames = links.slice(0, 6).map((l) => graph.nodes[l.i].label);

  return (
    <div className="map-concept">
      <div className="map-concept-head">
        <h2>{node.label}</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close this concept">
          ×
        </button>
      </div>
      <p className="map-concept-subjects">
        {[...new Set(node.subjects)].map((s) => (
          <span key={s} className="map-tag">
            {subjectLabel(s)} · {s.split("/")[0]}
          </span>
        ))}
      </p>
      <p className="map-concept-mastery">
        {mastery === null ? "You haven't studied this one yet." : `Your mastery: ${Math.round(mastery * 100)}%${mastery < 0.5 ? " (needs work)" : ""}`}
      </p>
      <div className="map-concept-actions">
        <button type="button" className={focus ? "btn btn-secondary active" : "btn btn-secondary"} aria-pressed={focus} onClick={onFocus}>
          {focus ? "Show everything" : "Focus on its links"}
        </button>
        {aiOn && (
          <button
            type="button"
            className="btn btn-secondary ask-alfond"
            onClick={() => { onAsk(`Explain "${node.label}" and how it connects to ${neighbourNames.join(", ")} across my subjects. Keep it short and exam-focused.`); }}
          >
            <AlfondIcon />
            Ask Alfond
          </button>
        )}
      </div>

      {links.length > 0 && (
        <section>
          <h3>Linked to</h3>
          <ul className="map-links">
            {links.map((l) => (
              <li key={l.i}>
                <button type="button" onClick={() => { onOpen(l.i); }}>
                  {l.rel ? <small className="map-rel">{l.rel}</small> : null}
                  {graph.nodes[l.i].label}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sections.length > 0 && (
        <section>
          <h3>Read about it</h3>
          <ul className="map-material">
            {sections.map((s, i) => (
              <li key={i}>
                <Link to={sectionLink(s.c, s.a)}>
                  {s.h || sectionTitle(s.c)}
                  <small>{sectionTitle(s.c)}</small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(cardEntries.length > 0 || questionEntries.length > 0 || labelEntries.length > 0) && (
        <section>
          <h3>Practise it</h3>
          <ul className="map-material">
            {cardEntries.map(([key, ids]) => (
              <li key={`c${key}`}>
                <Link to={`/flashcards/${key}?cards=${ids.join(",")}`}>
                  {ids.length} flashcard{ids.length === 1 ? "" : "s"}
                  <small>
                    {withBlock(key)} · e.g. “{flashcardDecks.get(key)?.find((c) => c.id === ids[0])?.front.slice(0, 70) ?? ""}”
                  </small>
                </Link>
              </li>
            ))}
            {questionEntries.map(([key, ids]) => (
              <li key={`q${key}`}>
                <Link to={`/quizzes/${key}?drill=${ids.join(",")}`}>
                  {ids.length} quiz question{ids.length === 1 ? "" : "s"}
                  <small>
                    {withBlock(key)} · e.g. “{quizBanks.get(key)?.find((q) => q.id === ids[0])?.question.slice(0, 70) ?? ""}”
                  </small>
                </Link>
              </li>
            ))}
            {labelEntries.map(([key, ids]) => (
              <li key={`l${key}`}>
                <Link to={`/occlusion/${key}`}>
                  {ids.length} labelled figure{ids.length === 1 ? "" : "s"}
                  <small>{withBlock(key)} image occlusion</small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ConceptList({
  graph,
  visible,
  mastery,
  neighbours,
  shared,
  subjectLabel,
  onOpen,
  selected,
}: {
  graph: KnowledgeGraph;
  visible: boolean[];
  mastery: (number | null)[];
  neighbours: Map<number, { i: number }[]>;
  shared: boolean[];
  subjectLabel: (key: string) => string;
  onOpen: (i: number) => void;
  selected: number | null;
}) {
  const rows = graph.nodes
    .map((n, i) => ({ n, i }))
    .filter(({ i }) => visible.at(i))
    .sort((a, b) => (neighbours.get(b.i)?.length ?? 0) - (neighbours.get(a.i)?.length ?? 0));
  return (
    <div className="map-list">
      <table>
        <thead>
          <tr>
            <th scope="col">Concept</th>
            <th scope="col">Subjects</th>
            <th scope="col">Links</th>
            <th scope="col">Mastery</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ n, i }) => (
            <tr key={i} className={i === selected ? "selected" : undefined}>
              <td>
                <button type="button" onClick={() => { onOpen(i); }}>
                  {n.label}
                </button>
                {shared.at(i) && <small className="map-shared-tag">shared</small>}
              </td>
              <td>{[...new Set(n.subjects.map((s) => `${subjectLabel(s)} ${s.split("/")[0]}`))].join(", ")}</td>
              <td>{neighbours.get(i)?.length ?? 0}</td>
              <td>{percent(mastery.at(i) ?? null)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
