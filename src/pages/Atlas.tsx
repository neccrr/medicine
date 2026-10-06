import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlfondIcon, SearchIcon } from "../components/icons";
import { AtlasViewer, type Picked, type ViewName } from "../components/atlas/viewer";
import { useAccount } from "../hooks/useAccount";
import { askAlfondAbout } from "../lib/alfond";
import {
  allStructures,
  ATLAS_BASE,
  ATTACHMENTS,
  attachmentsFor,
  defaultOpacity,
  describeStructure,
  formatMB,
  parseNode,
  searchAtlas,
  sideLabel,
  atlasFiles,
  DEFAULT_HIDDEN_GROUPS,
  nodesOutside,
  topGroupOf,
  topGroups,
  type AtlasIndex,
} from "../lib/atlas/model";

// The 3D anatomy atlas: the whole body from Z-Anatomy, one system at a time or together. Click
// a part to name it, read what it is, see its landmarks and where a muscle attaches.

const DEFAULT_LAYERS = ["skeletal"];
const QUICK = ["Femur", "Heart", "Brain", "Deltoid muscle", "Kidney", "Scapula", "Liver", "Sciatic nerve"];

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function Atlas() {
  const { config } = useAccount();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const host = useRef<HTMLDivElement>(null);
  const viewer = useRef<AtlasViewer | null>(null);
  const [index, setIndex] = useState<AtlasIndex | null>(null);
  const [failed, setFailed] = useState(false);
  const [webgl] = useState(hasWebGL);
  const [descriptions, setDescriptions] = useState<Record<string, string> | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [opacity, setOpacity] = useState<Record<string, number>>({});
  const [hover, setHover] = useState<(Picked & { x: number; y: number }) | null>(null);
  const [query, setQuery] = useState("");
  const [isolating, setIsolating] = useState(false);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [attachFor, setAttachFor] = useState<string | null>(null);
  const [landmark, setLandmark] = useState<string | null>(null);
  // Per system, the top-level groups (regions, the fasciae…) left out of the view.
  const [hiddenGroups, setHiddenGroups] = useState<Record<string, string[]>>(DEFAULT_HIDDEN_GROUPS);

  const rawLayers = params.get("layers");
  const layers = useMemo(() => (rawLayers === null ? DEFAULT_LAYERS : rawLayers.split(",").filter(Boolean)), [rawLayers]);
  // Kept by its text, so changing other parts of the URL (layers) doesn't count as a new selection.
  const rawSelected = params.get("s");
  const selected = useMemo((): Picked | null => {
    const at = rawSelected?.indexOf("/") ?? -1;
    return rawSelected && at > 0 ? { system: rawSelected.slice(0, at), node: rawSelected.slice(at + 1) } : null;
  }, [rawSelected]);

  const setUrl = useCallback(
    (change: { layers?: string[]; selected?: Picked | null }) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (change.layers) next.set("layers", change.layers.join(","));
          if (change.selected !== undefined) {
            if (change.selected) next.set("s", `${change.selected.system}/${change.selected.node}`);
            else next.delete("s");
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  useEffect(() => {
    let live = true;
    fetch(`${ATLAS_BASE}atlas.json`)
      .then((r) => (r.ok ? (r.json() as Promise<AtlasIndex>) : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        if (live) setIndex(data);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, []);

  // The viewer lives as long as the page.
  const selectRef = useRef<(p: Picked | null) => void>(() => {});
  useEffect(() => {
    if (!webgl || !host.current) return;
    const v = new AtlasViewer(host.current, {
      onSelect: (p) => { selectRef.current(p); },
      onHover: setHover,
      onProgress: (system, fraction) => {
        setProgress((prev) => {
          const next = { ...prev };
          if (fraction === null) delete next[system];
          else next[system] = fraction;
          return next;
        });
      },
      onError: (system) => { setErrors((prev) => [...new Set([...prev, system])]); },
    });
    viewer.current = v;
    return () => {
      v.dispose();
      viewer.current = null;
    };
  }, [webgl]);

  // Layers on and off, loading each model the first time it's shown.
  const shownBefore = useRef<Set<string>>(new Set());
  useEffect(() => {
    const v = viewer.current;
    if (!v || !index) return;
    v.setFiles(atlasFiles(index));
    const want = new Set(layers);
    const first = shownBefore.current.size === 0;
    for (const s of [...index.systems.map((x) => x.id), ATTACHMENTS]) {
      const on = want.has(s);
      if (on || shownBefore.current.has(s)) {
        void v.show(s, on).then(() => {
          if (first && on) v.frameAll();
        });
      }
      if (on) shownBefore.current.add(s);
    }
  }, [layers, index]);

  // Groups left out, applied to each system (now, or when it loads).
  useEffect(() => {
    const v = viewer.current;
    if (!v || !index) return;
    for (const s of index.systems) v.filterSystem(s.id, nodesOutside(index, s.id, hiddenGroups[s.id] ?? []));
  }, [index, hiddenGroups]);

  // The selection: highlighted, and its system shown.
  useEffect(() => {
    const v = viewer.current;
    if (!v) return;
    if (!selected) {
      v.select(null);
      v.setMarkers([]);
      return;
    }
    if (!layers.includes(selected.system)) setUrl({ layers: [...layers, selected.system] });
    // A structure in a group that's left out brings its group back.
    const group = index ? topGroupOf(index, selected.system, selected.node) : null;
    if (group && hiddenGroups[selected.system]?.includes(group)) {
      setHiddenGroups((prev) => ({ ...prev, [selected.system]: (prev[selected.system] ?? []).filter((g) => g !== group) }));
    }
    let live = true;
    const apply = () => {
      if (!live) return;
      v.select(selected);
      const marks = (index?.landmarks[selected.system] ?? []).filter((l) => l[4] === selected.node);
      v.setMarkers(
        marks.map(([name, x, y, z]) => ({ name, at: [x, y, z] })),
        landmark,
      );
    };
    if (v.has(selected)) apply();
    else void v.show(selected.system, true).then(apply).catch(() => {});
    return () => {
      live = false;
    };
    // layers only matters for adding the selection's system once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, index, landmark]);

  // A new selection starts with no landmark picked.
  const selectedKey = selected ? `${selected.system}/${selected.node}` : "";
  useEffect(() => {
    setLandmark(null);
  }, [selectedKey]);

  // Descriptions: fetched the first time something is selected.
  useEffect(() => {
    if (!selected || descriptions) return;
    fetch(`${ATLAS_BASE}descriptions.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Record<string, string>>) : Promise.reject(new Error(String(r.status)))))
      .then(setDescriptions)
      .catch(() => { setDescriptions({}); });
  }, [selected, descriptions]);

  const select = useCallback(
    (p: Picked | null, focus = false) => {
      setUrl({ selected: p });
      if (p && focus) {
        const v = viewer.current;
        const go = () => v?.focus(p);
        if (v?.has(p)) go();
        else void v?.show(p.system, true).then(go).catch(() => {});
      }
    },
    [setUrl],
  );
  useEffect(() => {
    selectRef.current = (p) => { select(p); };
  }, [select]);

  const toggleLayer = (id: string) => {
    const on = layers.includes(id);
    setUrl({ layers: on ? layers.filter((l) => l !== id) : [...layers, id] });
    if (id === ATTACHMENTS && on) {
      setAttachFor(null);
      viewer.current?.filterSystem(ATTACHMENTS, null);
    }
  };

  const all = useMemo(() => (index ? allStructures(index) : []), [index]);
  const results = useMemo(() => (query.trim().length >= 2 ? searchAtlas(all, query) : []), [all, query]);
  const labelOf = (system: string) => (system === ATTACHMENTS ? "Muscle attachments" : (index?.systems.find((s) => s.id === system)?.label ?? system));

  const sel = selected ? parseNode(selected.node) : null;
  const selPath = selected && index ? (index.nodes[selected.system]?.find(([n]) => n === selected.node)?.[1] ?? -1) : -1;
  const attachment = selected?.system === ATTACHMENTS ? index?.attachments.find(([n]) => n === selected.node) : undefined;
  const muscleAttachments = selected && index && selected.system === "muscular" ? attachmentsFor(index, selected.node) : [];
  const description = selected ? describeStructure(descriptions, attachment ? attachment[1] : selected.node) : null;
  const landmarks = selected ? (index?.landmarks[selected.system] ?? []).filter((l) => l[4] === selected.node) : [];

  const showAttachments = () => {
    if (!selected || !index) return;
    const nodes = muscleAttachments.map((a) => a.node);
    setAttachFor(sel?.name ?? null);
    const want = new Set([...layers, "skeletal", ATTACHMENTS]);
    setUrl({ layers: [...want] });
    // The muscles turn see-through, so their origin and insertion show on the bone beneath.
    setOpacity((prev) => ({ ...prev, muscular: 0.3 }));
    viewer.current?.setOpacity("muscular", 0.3);
    viewer.current?.focus(selected);
    void viewer.current?.show(ATTACHMENTS, true).then(() => { viewer.current?.filterSystem(ATTACHMENTS, nodes); });
  };

  const view = (name: ViewName) => { viewer.current?.view(name); };
  const refreshCounts = () => {
    setIsolating(viewer.current?.isolating ?? false);
    setHiddenCount(viewer.current?.hiddenCount ?? 0);
  };

  const systemsPanel = index && (
    <div className="atlas-systems" role="group" aria-label="Body systems">
      {[...index.systems, ...(index.attachmentsFile ? [{ id: ATTACHMENTS, label: "Muscle attachments", bytes: index.attachmentsFile.bytes, structures: index.attachments.length }] : [])].map((s) => {
        const on = layers.includes(s.id);
        const loading = progress[s.id];
        return (
          <div key={s.id} className={on ? "atlas-system is-on" : "atlas-system"}>
            <label>
              <input type="checkbox" checked={on} onChange={() => { toggleLayer(s.id); }} />
              <span className="atlas-system-name">{s.label}</span>
              <span className="atlas-system-meta">
                {loading !== undefined ? `${Math.round(loading * 100)}%` : errors.includes(s.id) ? "failed" : formatMB(s.bytes)}
              </span>
            </label>
            {loading !== undefined && <progress className="atlas-progress" max={1} value={loading} aria-label={`Loading ${s.label}`} />}
            {on && s.id !== ATTACHMENTS && (
              <input
                type="range"
                className="atlas-opacity"
                min={0.1}
                max={1}
                step={0.05}
                value={opacity[s.id] ?? defaultOpacity(s.id)}
                aria-label={`${s.label} opacity`}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setOpacity((prev) => ({ ...prev, [s.id]: value }));
                  viewer.current?.setOpacity(s.id, value);
                }}
              />
            )}
            {on && s.id !== ATTACHMENTS && index && topGroups(index, s.id).length > 1 && (
              <div className="atlas-groups" role="group" aria-label={`${s.label}: parts shown`}>
                {topGroups(index, s.id).map((g) => {
                  const off = hiddenGroups[s.id]?.includes(g.name) ?? false;
                  return (
                    <button
                      key={g.name}
                      type="button"
                      className={off ? "atlas-group" : "atlas-group is-on"}
                      aria-pressed={!off}
                      title={`${g.count} structures`}
                      onClick={() => {
                        setHiddenGroups((prev) => {
                          const list = prev[s.id] ?? [];
                          return { ...prev, [s.id]: off ? list.filter((x) => x !== g.name) : [...list, g.name] };
                        });
                      }}
                    >
                      {g.name.replace(/ (of|part of) (the )?(muscular system|human body)$/i, "").replace(/^(Muscular system|Regions|Joints) of /i, "")}
                    </button>
                  );
                })}
              </div>
            )}
            {s.id === ATTACHMENTS && on && <p className="atlas-legend"><span className="atlas-swatch origin" /> origin <span className="atlas-swatch insertion" /> insertion{attachFor ? ` · ${attachFor}` : ""}</p>}
          </div>
        );
      })}
    </div>
  );

  return (
    <section className="page atlas-page">
      <h1>3D anatomy</h1>
      <p className="subtitle">
        The whole body in 3D: bones, joints, muscles, vessels, nerves and organs. Turn systems on and off, click any part to name it, and drag to turn it
        around.
      </p>

      {!webgl ? (
        <p className="atlas-note">This browser can't show 3D graphics (WebGL is off or not supported). Try Chrome, Edge, Firefox or Safari.</p>
      ) : failed ? (
        <p className="atlas-note">The atlas couldn't be loaded. Check your connection and reload.</p>
      ) : null}

      <div className="atlas">
        <aside className="atlas-side" aria-label="Find and choose">
          <label className="atlas-search">
            <SearchIcon />
            <span className="sr-only">Find a structure</span>
            <input type="search" placeholder="Find a structure" value={query} onChange={(e) => { setQuery(e.target.value); }} />
          </label>
          {results.length > 0 ? (
            <ul className="atlas-results" aria-label="Matches">
              {results.map((r) => (
                <li key={`${r.system}/${r.node}`}>
                  <button type="button" onClick={() => { setQuery(""); select({ system: r.system, node: r.node }, true); }}>
                    <strong>{r.name}</strong>
                    <small>
                      {labelOf(r.system)}
                      {r.path.length ? ` · ${r.path.at(-1)}` : ""}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.trim().length >= 2 ? (
            <p className="atlas-hint">Nothing called “{query.trim()}”.</p>
          ) : (
            systemsPanel
          )}
        </aside>

        <div className="atlas-stage">
          <div className="atlas-viewport" ref={host}>
            {hover && (
              <div className="atlas-hover" style={{ transform: `translate(${hover.x + 14}px, ${hover.y + 10}px)` }} aria-hidden="true">
                {parseNode(hover.node).name}
                {parseNode(hover.node).side && <small> {sideLabel(parseNode(hover.node).side)}</small>}
              </div>
            )}
            {Object.keys(progress).length > 0 && <div className="atlas-loading">Loading {Object.keys(progress).map(labelOf).join(", ")}…</div>}
          </div>
          <div className="atlas-tools" role="toolbar" aria-label="View">
            {(["front", "back", "left", "right", "top"] as const).map((v) => (
              <button key={v} type="button" className="atlas-chip" onClick={() => { view(v); }}>
                {v[0].toUpperCase() + v.slice(1)}
              </button>
            ))}
            <button type="button" className="atlas-chip" onClick={() => viewer.current?.frameAll()}>
              Whole body
            </button>
            {(isolating || hiddenCount > 0) && (
              <button
                type="button"
                className="atlas-chip is-on"
                onClick={() => {
                  viewer.current?.showAll();
                  refreshCounts();
                }}
              >
                Show all{hiddenCount > 0 ? ` (${hiddenCount} hidden)` : ""}
              </button>
            )}
          </div>
        </div>

        <aside className="atlas-info" aria-live="polite">
          {selected && sel ? (
            <>
              <p className="atlas-kicker">
                {labelOf(selected.system)}
                {sel.side && ` · ${sideLabel(sel.side)}`}
              </p>
              <h2>{attachment ? `${attachment[2] === "o" ? "Origin" : "Insertion"} of ${parseNode(attachment[1]).name}` : sel.name}</h2>
              {selPath >= 0 && index && (index.paths[selPath]?.length ?? 0) > 0 && (
                <p className="atlas-path">{index.paths[selPath]?.join(" › ")}</p>
              )}
              <div className="atlas-actions">
                <button type="button" className="atlas-chip" onClick={() => viewer.current?.focus(selected)}>
                  Focus
                </button>
                <button
                  type="button"
                  className="atlas-chip"
                  onClick={() => {
                    viewer.current?.isolate(viewer.current.isolating ? null : [selected]);
                    refreshCounts();
                  }}
                >
                  {isolating ? "Show the rest" : "Only this"}
                </button>
                <button
                  type="button"
                  className="atlas-chip"
                  onClick={() => {
                    viewer.current?.hide(selected);
                    refreshCounts();
                    select(null);
                  }}
                >
                  Hide
                </button>
                {muscleAttachments.length > 0 && (
                  <button type="button" className="atlas-chip" onClick={showAttachments}>
                    Where it attaches
                  </button>
                )}
              </div>
              {config?.ai === true && (
                <button
                  type="button"
                  className="atlas-ask"
                  onClick={() => {
                    askAlfondAbout(`Explain the ${sel.name.toLowerCase()}: what it is, where it is, what it does and what it relates to. Keep it short and exam-focused.`, () => {
                      navigate("/alfond");
                    });
                  }}
                >
                  <AlfondIcon />
                  Ask Alfond about {sel.name}
                </button>
              )}
              {description ? (
                <div className="atlas-description">
                  {description.split("\n\n").map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                  <p className="atlas-source">From Z-Anatomy, after Wikipedia (CC BY-SA).</p>
                </div>
              ) : descriptions ? (
                <p className="atlas-hint">No description for this one yet.</p>
              ) : (
                <p className="atlas-hint">Loading the description…</p>
              )}
              {landmarks.length > 0 && (
                <details className="atlas-landmarks-box" open={landmarks.length <= 8}>
                  <summary>
                    <h3>Landmarks</h3> <span className="atlas-count">{landmarks.length}</span>
                  </summary>
                  <ul className="atlas-landmarks">
                    {landmarks.map(([name, x, y, z]) => (
                      <li key={name}>
                        <button
                          type="button"
                          aria-pressed={landmark === name}
                          className={landmark === name ? "is-on" : undefined}
                          onClick={() => {
                            setLandmark(name);
                            viewer.current?.focusPoint([x, y, z]);
                          }}
                        >
                          {name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <Link to={`/search?q=${encodeURIComponent(sel.name)}`} className="atlas-more">
                Find “{sel.name}” in your notes →
              </Link>
            </>
          ) : (
            <div className="atlas-empty">
              <p className="atlas-empty-title">Click any part to name it</p>
              <p>Drag to turn the body, right-drag (or two fingers) to move it, scroll or pinch to zoom. Search finds any of the {all.length ? new Set(all.map((h) => h.name)).size.toLocaleString() : "1,800"} structures.</p>
              <div className="atlas-quick">
                {QUICK.map((name) => {
                  const hit = searchAtlas(all, name, 1)[0];
                  return hit ? (
                    <button key={name} type="button" className="atlas-chip" onClick={() => { select({ system: hit.system, node: hit.node }, true); }}>
                      {name}
                    </button>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </aside>
      </div>

      <p className="atlas-credit">
        Models and descriptions: <a href="https://www.z-anatomy.com/" target="_blank" rel="noopener noreferrer">Z-Anatomy</a> (CC BY-SA 4.0), based
        on BodyParts3D, © The Database Center for Life Science (CC BY-SA 2.1 JP). <a href={`${ATLAS_BASE}LICENSE.txt`}>Licence and credits</a>.
      </p>
    </section>
  );
}
