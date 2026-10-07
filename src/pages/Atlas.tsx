import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlfondIcon, SearchIcon } from "../components/icons";
import { AtlasViewer, type NavMode, type Picked, type SelectInfo, type ViewName, type ViewSide } from "../components/atlas/viewer";
import {
  BackIcon,
  ExpandIcon,
  HelpIcon,
  MouseIcon,
  FitIcon,
  ForwardIcon,
  PivotIcon,
  ShrinkIcon,
  TiltDownIcon,
  TiltUpIcon,
  TurnLeftIcon,
  TurnRightIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "../components/atlas/AtlasIcons";
import { useAccount } from "../hooks/useAccount";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { STORAGE_KEYS } from "../lib/storage";
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
  sideEnglish,
  sideShort,
  latinOf,
  latinWithSide,
  greekRoot,
  type LatinNames,
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

/** Typing in a text box (so single-key shortcuts stay out of the way). */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return true;
  return target instanceof HTMLInputElement && !["checkbox", "radio", "range", "button"].includes(target.type);
}

/** The same structure on the other side ("Femur.r" → "Femur.l"), if it has one. */
const otherSide = (node: string) => (/\.r$/.test(node) ? node.replace(/\.r$/, ".l") : /\.l$/.test(node) ? node.replace(/\.l$/, ".r") : null);

/** The controls card: [how, what], for each mouse scheme and for selecting. */
const UNREAL_CONTROLS: [string, string][] = [
  ["Right-drag", "Look around"],
  ["Right + W A S D", "Fly; Q E down, up; Shift faster"],
  ["Right + wheel", "Flying speed (1–8)"],
  ["Left-drag", "Turn and move forward or back"],
  ["Middle-drag, left + right", "Pan"],
  ["Alt + left-drag", "Orbit the selected structure"],
  ["Alt + right-drag", "Move in or out"],
  ["Wheel", "Zoom toward the pointer"],
  ["F", "Frame the selection"],
];
const ORBIT_CONTROLS: [string, string][] = [
  ["Left-drag", "Turn the body"],
  ["Right-drag", "Pan"],
  ["Wheel", "Zoom toward the pointer"],
  ["F", "Frame the selection"],
];
const SELECT_CONTROLS: [string, string][] = [
  ["Click", "Select; again in the same place for the one beneath"],
  ["Ctrl/⌘ + click", "Add to or take from the selection"],
  ["Double-click", "Fly to it"],
  ["Esc", "Clear the selection"],
];

/** The views, named as anatomists name them: [view, label, plain English]. */
const VIEW_BUTTONS: [ViewName, string, string][] = [
  ["front", "Anterior", "Front"],
  ["back", "Posterior", "Back"],
  ["left", "Sinistra", "Left side"],
  ["right", "Dextra", "Right side"],
  ["top", "Superior", "Top"],
];

const VIEW_KEYS: Record<string, ViewName> = { "1": "front", "2": "back", "3": "left", "4": "right", "5": "top" };
/** One press of a turn button or arrow key: 20°. */
const TURN = Math.PI / 9;

interface AtlasPrefs {
  /** The mouse scheme: Unreal Engine's viewport controls (the default) or a plain orbit. */
  nav?: NavMode;
  /** A clicked structure becomes what the view turns around. */
  follow: boolean;
  /** Recently opened structures, newest first, as "system/node". */
  recent: string[];
}
const DEFAULT_PREFS: AtlasPrefs = { follow: true, recent: [] };

const toKey = (p: Picked) => `${p.system}/${p.node}`;
const fromKey = (key: string): Picked | null => {
  const at = key.indexOf("/");
  return at > 0 ? { system: key.slice(0, at), node: key.slice(at + 1) } : null;
};

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
  const frame = useRef<HTMLDivElement>(null);
  const infoPanel = useRef<HTMLElement>(null);
  const searchBox = useRef<HTMLInputElement>(null);
  const resultsList = useRef<HTMLUListElement>(null);
  const viewer = useRef<AtlasViewer | null>(null);
  const [index, setIndex] = useState<AtlasIndex | null>(null);
  const [latin, setLatin] = useState<LatinNames | null>(null);
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
  const selected = useMemo((): Picked | null => (rawSelected ? fromKey(rawSelected) : null), [rawSelected]);
  const selectedKey = selected ? toKey(selected) : "";

  const [storedPrefs, setPrefs] = useLocalStorage<AtlasPrefs>(STORAGE_KEYS.atlasPrefs, DEFAULT_PREFS);
  const prefs: AtlasPrefs = { ...DEFAULT_PREFS, ...storedPrefs };
  const followRef = useRef(prefs.follow);
  useEffect(() => {
    followRef.current = prefs.follow;
  }, [prefs.follow]);
  const [side, setSide] = useState<ViewSide>("Anterior");
  // Unreal-style navigation: whether the right button is held (flying), and the speed readout.
  const [flying, setFlying] = useState(false);
  const [speedShown, setSpeedShown] = useState<number | null>(null);
  const speedTimer = useRef(0);
  const nav: NavMode = storedPrefs.nav ?? "unreal";
  // Structures added to the selection with Ctrl/⌘+click, and everything under the last click.
  const [also, setAlso] = useState<Picked[]>([]);
  const [stack, setStack] = useState<Picked[]>([]);
  // Kept in a ref too, for the selection effect.
  const alsoRef = useRef<Picked[]>([]);
  const [showControls, setShowControls] = useState(false);

  // The structures opened on this visit, to step back and forward through.
  const [trail, setTrail] = useState<{ keys: string[]; at: number }>({ keys: [], at: -1 });
  const stepping = useRef(false);

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
    // The Latin names come alongside; the atlas works without them.
    fetch(`${ATLAS_BASE}latin.json`)
      .then((r) => (r.ok ? (r.json() as Promise<LatinNames>) : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        if (live) setLatin(data);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  // The viewer lives as long as the page.
  const selectRef = useRef<(p: Picked | null, info?: SelectInfo) => void>(() => {});
  useEffect(() => {
    if (!webgl || !host.current) return;
    const v = new AtlasViewer(host.current, {
      onSelect: (p, info) => { selectRef.current(p, info); },
      onFlying: setFlying,
      onSpeed: (speed) => {
        setSpeedShown(speed);
        window.clearTimeout(speedTimer.current);
        speedTimer.current = window.setTimeout(() => { setSpeedShown(null); }, 1400);
      },
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
      onView: setSide,
    });
    viewer.current = v;
    return () => {
      v.dispose();
      viewer.current = null;
    };
  }, [webgl]);

  // A link to a structure opens on it; otherwise the page opens on the whole body.
  const openedOn = useRef(rawSelected);
  const focusOnce = useRef(Boolean(rawSelected));

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
          if (first && on && !openedOn.current) v.frameAll();
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
      v.select(null, alsoRef.current);
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
      v.select(selected, alsoRef.current);
      if (focusOnce.current) {
        focusOnce.current = false;
        v.focus(selected);
      }
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
    selectRef.current = (p, info) => {
      // Ctrl/⌘/Shift+click adds to (or takes away from) the selection, as in Unreal.
      // Ctrl/⌘+click on empty space leaves the selection alone.
      if (info?.additive && !p) return;
      if (info?.additive && p && selected) {
        const key = toKey(p);
        if (key === toKey(selected)) return;
        setAlso((prev) => (prev.some((x) => toKey(x) === key) ? prev.filter((x) => toKey(x) !== key) : [...prev, p]));
        return;
      }
      setAlso([]);
      if (info) setStack(p ? info.stack : []);
      select(p);
      // A clicked part becomes what the view turns around (the orbit camera slides to it).
      if (p && followRef.current) viewer.current?.centreOn(p);
    };
  }, [select, selected]);

  // The extra selection lives in the viewer too.
  useEffect(() => {
    alsoRef.current = also;
    viewer.current?.select(selected, also);
    // selected is applied by the selection effect; this only follows the extras.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [also]);

  // The navigation scheme follows the setting.
  useEffect(() => {
    viewer.current?.setNavigation(nav);
  }, [nav, webgl]);

  // Each newly opened structure joins the trail (unless it was reached by stepping along it)
  // and the recent list.
  useEffect(() => {
    if (!selectedKey) return;
    const key = selectedKey;
    if (stepping.current) {
      stepping.current = false;
      return;
    }
    setTrail((t) => {
      if (t.keys[t.at] === key) return t;
      const keys = [...t.keys.slice(0, t.at + 1), key].slice(-30);
      return { keys, at: keys.length - 1 };
    });
    setPrefs((prev) => {
      const p = { ...DEFAULT_PREFS, ...prev };
      return { ...p, recent: [key, ...p.recent.filter((k) => k !== key)].slice(0, 8) };
    });
  }, [selectedKey, setPrefs]);
  const step = (by: number) => {
    const at = trail.at + by;
    const key = trail.keys[at];
    const p = key ? fromKey(key) : null;
    if (!p) return;
    stepping.current = true;
    setTrail((t) => ({ ...t, at }));
    select(p, true);
  };
  const backTo = trail.keys[trail.at - 1];
  const forwardTo = trail.keys[trail.at + 1];
  const nameOf = (key: string | undefined) => (key ? parseNode(fromKey(key)?.node ?? "").name : "");

  const toggleLayer = (id: string) => {
    const on = layers.includes(id);
    setUrl({ layers: on ? layers.filter((l) => l !== id) : [...layers, id] });
    if (id === ATTACHMENTS && on) {
      setAttachFor(null);
      viewer.current?.filterSystem(ATTACHMENTS, null);
    }
  };

  const all = useMemo(() => (index ? allStructures(index, latin) : []), [index, latin]);
  const recent = useMemo(
    () => prefs.recent.flatMap((k) => {
      const p = fromKey(k);
      return p && index?.nodes[p.system]?.some(([n]) => n === p.node) ? [p] : [];
    }),
    [prefs.recent, index],
  );
  const quick = useMemo(() => QUICK.flatMap((name) => searchAtlas(all, name, 1).slice(0, 1)), [all]);
  const structureCount = useMemo(() => new Set(all.map((h) => h.name)).size, [all]);
  const results = useMemo(() => (query.trim().length >= 2 ? searchAtlas(all, query) : []), [all, query]);
  const labelOf = (system: string) => (system === ATTACHMENTS ? "Muscle attachments" : (index?.systems.find((s) => s.id === system)?.label ?? system));

  const sel = selected ? parseNode(selected.node) : null;
  // The Latin name with its side ("Ren dexter"), and the Greek root where clinical terms use it.
  const selName = selected ? (selected.system === ATTACHMENTS ? null : sel?.name ?? null) : null;
  const selLatinBase = selName ? latinOf(latin, selName) : null;
  const selLatin = selLatinBase && sel ? latinWithSide(selLatinBase, sel.side) : null;
  const selGreek = selName ? greekRoot(selName) : null;
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

  // Full screen: the browser's own where it has one for an element, else (iPhone) the atlas
  // covering the page.
  const [nativeFull, setNativeFull] = useState(false);
  const [pageFull, setPageFull] = useState(false);
  const fullScreen = nativeFull || pageFull;
  useEffect(() => {
    const onChange = () => { setNativeFull(document.fullscreenElement !== null && document.fullscreenElement === frame.current); };
    document.addEventListener("fullscreenchange", onChange);
    return () => { document.removeEventListener("fullscreenchange", onChange); };
  }, []);
  useEffect(() => {
    if (!pageFull) return;
    document.documentElement.classList.add("atlas-page-full");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPageFull(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.classList.remove("atlas-page-full");
      window.removeEventListener("keydown", onKey);
    };
  }, [pageFull]);
  const toggleFullScreen = () => {
    const el = frame.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    if (pageFull) {
      setPageFull(false);
      return;
    }
    if (typeof el.requestFullscreen === "function" && document.fullscreenEnabled) el.requestFullscreen().catch(() => { setPageFull(true); });
    else setPageFull(true);
  };

  const toggleIsolate = () => {
    if (!selected) return;
    viewer.current?.isolate(viewer.current.isolating ? null : [selected, ...also]);
    refreshCounts();
  };
  const hideSelected = () => {
    if (!selected) return;
    for (const p of [selected, ...also]) viewer.current?.hide(p);
    refreshCounts();
    setAlso([]);
    select(null);
  };
  const showEverything = () => {
    viewer.current?.showAll();
    refreshCounts();
  };
  const other = selected ? otherSide(selected.node) : null;
  const otherPicked = selected && other && index?.nodes[selected.system]?.some(([n]) => n === other) ? { system: selected.system, node: other } : null;

  // Keys: / to search, Esc to let go, F focus, H hide, O only this, A show all, 1–5 views, 0 whole body.
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keys.current = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || viewer.current?.isFlying) return;
      const k = e.key.toLowerCase();
      if (k === "/") searchBox.current?.focus();
      else if (k === "escape" && also.length > 0) setAlso([]);
      else if (k === "escape" && selected) select(null);
      else if (k === "f" && selected) viewer.current?.focus(selected);
      else if (k === "h" && selected) hideSelected();
      else if (k === "o" && selected) toggleIsolate();
      else if (k === "a") showEverything();
      else if (k === "0") viewer.current?.frameAll();
      else if (VIEW_KEYS[k]) view(VIEW_KEYS[k]);
      else if (k === "arrowleft" || k === "arrowright" || k === "arrowup" || k === "arrowdown") {
        const x = k === "arrowleft" ? 1 : k === "arrowright" ? -1 : 0;
        const y = k === "arrowup" ? 1 : k === "arrowdown" ? -1 : 0;
        // Shift slides the view instead of turning it.
        if (e.shiftKey) viewer.current?.pan(-x * 0.12, y * 0.12);
        else viewer.current?.orbit(x * TURN, y * TURN);
      } else if (k === "+" || k === "=") viewer.current?.zoom(0.75);
      else if (k === "-" || k === "_") viewer.current?.zoom(1 / 0.75);
      else if (k === "backspace") step(e.shiftKey ? 1 : -1);
      else return;
      e.preventDefault();
    };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { keys.current(e); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); };
  }, []);

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
                {(hiddenGroups[s.id]?.length ?? 0) > 0 && (
                  <button type="button" className="atlas-group-reset" onClick={() => { setHiddenGroups((prev) => ({ ...prev, [s.id]: [] })); }}>
                    Show all parts
                  </button>
                )}
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

      <div className={pageFull ? "atlas is-page-full" : "atlas"} ref={frame}>
        <aside className="atlas-side" aria-label="Find and choose">
          <label className="atlas-search">
            <SearchIcon />
            <span className="sr-only">Find a structure</span>
            <input
              ref={searchBox}
              type="search"
              placeholder="Find a structure"
              value={query}
              onChange={(e) => { setQuery(e.target.value); }}
              onKeyDown={(e) => {
                const first = results[0];
                if (e.key === "Enter" && first) {
                  setQuery("");
                  // Back to the model, so its keys (arrows, Backspace…) work straight away.
                  e.currentTarget.blur();
                  select({ system: first.system, node: first.node }, true);
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  resultsList.current?.querySelector("button")?.focus();
                } else if (e.key === "Escape") {
                  setQuery("");
                }
              }}
            />
            <kbd className="atlas-key" aria-hidden="true">/</kbd>
          </label>
          {results.length > 0 ? (
            <ul
              className="atlas-results"
              aria-label="Matches"
              ref={resultsList}
              onKeyDown={(e) => {
                // Up and down move between matches; up from the first goes back to the box.
                if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
                e.preventDefault();
                const buttons = [...(resultsList.current?.querySelectorAll("button") ?? [])];
                const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
                const next = e.key === "ArrowDown" ? buttons[at + 1] : at <= 0 ? searchBox.current : buttons[at - 1];
                next?.focus();
              }}
            >
              {results.map((r) => (
                <li key={`${r.system}/${r.node}`}>
                  <button type="button" onClick={() => { setQuery(""); select({ system: r.system, node: r.node }, true); }}>
                    <strong>{r.name}</strong>
                    {r.latin && r.latin.toLowerCase() !== r.name.toLowerCase() && <em className="atlas-latin-small">{r.latin}</em>}
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
                {parseNode(hover.node).side && <small> {sideLabel(parseNode(hover.node).side).toLowerCase()}</small>}
                {latinOf(latin, parseNode(hover.node).name) && (
                  <em className="atlas-hover-latin" lang="la">
                    {latinWithSide(latinOf(latin, parseNode(hover.node).name) ?? "", parseNode(hover.node).side)}
                  </em>
                )}
              </div>
            )}
            {Object.keys(progress).length > 0 && (
              <div className="atlas-loading" role="status">
                <span className="atlas-spinner" aria-hidden="true" />
                Loading {Object.entries(progress).map(([id, f]) => `${labelOf(id).toLowerCase()} ${Math.round(f * 100)}%`).join(", ")}
              </div>
            )}
          </div>
          {selected && sel && (
            // On a phone the panel is further down: the name shows on the model, and leads there.
            <button type="button" className="atlas-picked" onClick={() => { infoPanel.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
              <strong>{attachment ? `${attachment[2] === "o" ? "Origin" : "Insertion"} of ${parseNode(attachment[1]).name}` : sel.name}</strong>
              {sel.side && <small> {sideLabel(sel.side)}</small>}
              <span aria-hidden="true"> ↓</span>
            </button>
          )}
          {flying && (
            <div className="atlas-fly-hint" aria-live="polite">
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd> fly · <kbd>Q</kbd>
              <kbd>E</kbd> down, up · <kbd>Shift</kbd> fast · speed {viewer.current?.flyingSpeed ?? 4}
            </div>
          )}
          {speedShown !== null && (
            <div className="atlas-speed" role="status">
              Camera speed <strong>{speedShown}</strong>
              <span className="atlas-speed-bar" aria-hidden="true">
                {Array.from({ length: 8 }, (_, i) => (
                  <span key={i} className={i < speedShown ? "is-on" : undefined} />
                ))}
              </span>
            </div>
          )}
          <div className="atlas-corner">
            <span className="atlas-side-label" aria-live="polite">
              {side === "Sinistra" || side === "Dextra" ? `Lateralis ${side.toLowerCase()}` : side}
            </span>
            <button
              type="button"
              className="atlas-nav-mode"
              onClick={() => { setPrefs((prev) => ({ ...DEFAULT_PREFS, ...prev, nav: nav === "unreal" ? "orbit" : "unreal" })); }}
              title={nav === "unreal" ? "Unreal Engine controls (click for the orbit camera)" : "Orbit camera (click for Unreal Engine controls)"}
              aria-label={`Mouse controls: ${nav === "unreal" ? "Unreal Engine" : "orbit"}. Switch.`}
            >
              <MouseIcon />
              {nav === "unreal" ? "Unreal" : "Orbit"}
            </button>
            <button
              type="button"
              className={showControls ? "atlas-icon-btn is-on" : "atlas-icon-btn"}
              aria-pressed={showControls}
              aria-expanded={showControls}
              onClick={() => { setShowControls((x) => !x); }}
              title="Controls"
              aria-label="Show the controls"
            >
              <HelpIcon />
            </button>
            <button
              type="button"
              className="atlas-icon-btn"
              aria-pressed={fullScreen}
              onClick={toggleFullScreen}
              title={fullScreen ? "Exit full screen (Esc)" : "Full screen"}
              aria-label={fullScreen ? "Exit full screen" : "Show the atlas full screen"}
            >
              {fullScreen ? <ShrinkIcon /> : <ExpandIcon />}
            </button>
          </div>
          {showControls && (
            <div className="atlas-controls-card" role="dialog" aria-label="Controls">
              <p className="atlas-controls-title">{nav === "unreal" ? "Unreal Engine controls" : "Orbit camera controls"}</p>
              <dl>
                {(nav === "unreal" ? UNREAL_CONTROLS : ORBIT_CONTROLS).map(([how, what]) => (
                  <div key={how}>
                    <dt>{how}</dt>
                    <dd>{what}</dd>
                  </div>
                ))}
                {SELECT_CONTROLS.map(([how, what]) => (
                  <div key={how}>
                    <dt>{how}</dt>
                    <dd>{what}</dd>
                  </div>
                ))}
              </dl>
              <p className="atlas-controls-note">Touch: drag to turn, two fingers to move and zoom, tap to select.</p>
            </div>
          )}
          <div className="atlas-pad" role="group" aria-label="Move the view">
            <button type="button" className="atlas-icon-btn" onClick={() => viewer.current?.zoom(0.75)} title="Zoom in (+)" aria-label="Zoom in">
              <ZoomInIcon />
            </button>
            <button type="button" className="atlas-icon-btn" onClick={() => viewer.current?.zoom(1 / 0.75)} title="Zoom out (−)" aria-label="Zoom out">
              <ZoomOutIcon />
            </button>
            <span className="atlas-pad-gap" />
            <button type="button" className="atlas-icon-btn" onClick={() => viewer.current?.orbit(TURN)} title="Turn left (←)" aria-label="Turn left">
              <TurnLeftIcon />
            </button>
            <button type="button" className="atlas-icon-btn" onClick={() => viewer.current?.orbit(-TURN)} title="Turn right (→)" aria-label="Turn right">
              <TurnRightIcon />
            </button>
            <button type="button" className="atlas-icon-btn atlas-tilt" onClick={() => viewer.current?.orbit(0, TURN)} title="Look from higher (↑)" aria-label="Look from higher">
              <TiltUpIcon />
            </button>
            <button type="button" className="atlas-icon-btn atlas-tilt" onClick={() => viewer.current?.orbit(0, -TURN)} title="Look from lower (↓)" aria-label="Look from lower">
              <TiltDownIcon />
            </button>
            <span className="atlas-pad-gap" />
            <button type="button" className="atlas-icon-btn" onClick={() => viewer.current?.frameAll()} title="Whole body (0)" aria-label="Whole body">
              <FitIcon />
            </button>
            <button
              type="button"
              className={prefs.follow ? "atlas-icon-btn is-on" : "atlas-icon-btn"}
              aria-pressed={prefs.follow}
              onClick={() => { setPrefs((prev) => ({ ...DEFAULT_PREFS, ...prev, follow: !prefs.follow })); }}
              title={prefs.follow ? "Turning around the part you click (click to stop)" : "Turn around the part you click"}
              aria-label="Turn around the part you click"
            >
              <PivotIcon />
            </button>
          </div>
          <div className="atlas-tools" role="toolbar" aria-label="View">
            {VIEW_BUTTONS.map(([v, label, english]) => (
              <button key={v} type="button" className="atlas-chip" title={`${english} view`} onClick={() => { view(v); }}>
                {label}
              </button>
            ))}
            {(isolating || hiddenCount > 0) && (
              <button type="button" className="atlas-chip is-on" onClick={showEverything}>
                Show all{hiddenCount > 0 ? ` (${hiddenCount} hidden)` : ""}
              </button>
            )}
          </div>
        </div>

        <aside className="atlas-info" aria-live="polite" ref={infoPanel}>
          {selected && sel ? (
            <>
              <div className="atlas-info-head">
                <p className="atlas-kicker">
                  {labelOf(selected.system)}
                  {sel.side && (
                    <>
                      {" · "}
                      <span title={sideEnglish(sel.side)}>{sideLabel(sel.side)}</span>
                    </>
                  )}
                </p>
                {(backTo || forwardTo) && (
                  <div className="atlas-steps">
                    <button type="button" className="atlas-icon-btn" disabled={!backTo} onClick={() => { step(-1); }} title={backTo ? `Back to ${nameOf(backTo)} (Backspace)` : "Back"} aria-label={backTo ? `Back to ${nameOf(backTo)}` : "Back"}>
                      <BackIcon />
                    </button>
                    <button type="button" className="atlas-icon-btn" disabled={!forwardTo} onClick={() => { step(1); }} title={forwardTo ? `Forward to ${nameOf(forwardTo)}` : "Forward"} aria-label={forwardTo ? `Forward to ${nameOf(forwardTo)}` : "Forward"}>
                      <ForwardIcon />
                    </button>
                  </div>
                )}
              </div>
              <h2>{attachment ? `${attachment[2] === "o" ? "Origin" : "Insertion"} of ${parseNode(attachment[1]).name}` : sel.name}</h2>
              {(selLatin || selGreek) && (
                <p className="atlas-latin" lang="la">
                  {selLatin && <em>{selLatin}</em>}
                  {selGreek && (
                    <span className="atlas-greek" lang="grc-Latn" title="The Greek root behind the clinical terms">
                      {selLatin ? " · " : ""}Gr. {selGreek}
                    </span>
                  )}
                </p>
              )}
              {selPath >= 0 && index && (index.paths[selPath]?.length ?? 0) > 0 && (
                <p className="atlas-path">
                  {index.paths[selPath]?.map((g, i) => (
                    <span key={g}>
                      {i > 0 && " › "}
                      <button
                        type="button"
                        className="atlas-path-link"
                        title={`${latinOf(latin, g) ? `${latinOf(latin, g)}: ` : ""}everything in ${g}`}
                        onClick={() => { setQuery(g); searchBox.current?.focus(); }}
                      >
                        {g}
                      </button>
                    </span>
                  ))}
                </p>
              )}
              {stack.length > 1 && stack.some((p) => toKey(p) === toKey(selected)) && (
                <div className="atlas-stack">
                  <p className="atlas-stack-title">At this spot, front to back</p>
                  <div className="atlas-stack-list">
                    {stack.map((p) => {
                      const parsed = parseNode(p.node);
                      const on = toKey(p) === toKey(selected);
                      return (
                        <button
                          key={toKey(p)}
                          type="button"
                          className={on ? "atlas-stack-item is-on" : "atlas-stack-item"}
                          aria-pressed={on}
                          title={latinOf(latin, parsed.name) ? latinWithSide(latinOf(latin, parsed.name) ?? "", parsed.side) : parsed.name}
                          onClick={() => { setAlso([]); select(p); }}
                        >
                          {parsed.name}
                          {parsed.side ? <small> {sideShort(parsed.side)}</small> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {also.length > 0 && (
                <div className="atlas-also">
                  <p className="atlas-stack-title">Also selected ({also.length})</p>
                  <div className="atlas-stack-list">
                    {also.map((p) => {
                      const parsed = parseNode(p.node);
                      return (
                        <span key={toKey(p)} className="atlas-also-item">
                          <button type="button" className="atlas-also-name" onClick={() => { setAlso((prev) => [selected, ...prev.filter((x) => toKey(x) !== toKey(p))]); select(p); }}>
                            {parsed.name}
                            {parsed.side ? <small> {sideShort(parsed.side)}</small> : null}
                          </button>
                          <button type="button" className="atlas-also-remove" aria-label={`Take ${parsed.name} out of the selection`} onClick={() => { setAlso((prev) => prev.filter((x) => toKey(x) !== toKey(p))); }}>
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="atlas-actions">
                <button type="button" className="atlas-chip" onClick={() => viewer.current?.focus(selected)} aria-keyshortcuts="F">
                  Focus
                </button>
                <button type="button" className={isolating ? "atlas-chip is-on" : "atlas-chip"} onClick={toggleIsolate} aria-keyshortcuts="O">
                  {isolating ? "Show the rest" : also.length > 0 ? "Only these" : "Only this"}
                </button>
                <button type="button" className="atlas-chip" onClick={hideSelected} aria-keyshortcuts="H">
                  {also.length > 0 ? "Hide these" : "Hide"}
                </button>
                {otherPicked && (
                  <button type="button" className="atlas-chip" onClick={() => { select(otherPicked, true); }}>
                    {sel.side === "r" ? "Sinistra" : "Dextra"}
                  </button>
                )}
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
                    askAlfondAbout(`Explain the ${sel.name.toLowerCase()}${selLatin ? ` (${selLatin})` : ""}: what it is, where it is, what it does and what it relates to. Keep it short and exam-focused.`, () => {
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
                          {latinOf(latin, parseNode(name).name) && latinOf(latin, parseNode(name).name)?.toLowerCase() !== parseNode(name).name.toLowerCase() && (
                            <em className="atlas-latin-small" lang="la">
                              {latinOf(latin, parseNode(name).name)}
                            </em>
                          )}
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
              <p>
                {nav === "unreal"
                  ? "Unreal Engine controls: right-drag to look around and W A S D to fly while you hold it, left-drag to move, Alt + left-drag to orbit, scroll to zoom. "
                  : "Drag to turn the body, right-drag to move it, scroll to zoom. "}
                On a touch screen, drag with one or two fingers and pinch. Click a part to name it, again for the one beneath; double-click to fly to it. Search finds any of the{" "}
                {structureCount ? structureCount.toLocaleString() : "1,800"} structures, in English or Latin.
              </p>
              <div className="atlas-quick">
                {quick.map((hit) => {
                  const name = hit.name;
                  return (
                    <button key={name} type="button" className="atlas-chip" onClick={() => { select({ system: hit.system, node: hit.node }, true); }}>
                      {name}
                    </button>
                  );
                })}
              </div>
              {recent.length > 0 && (
                <>
                  <p className="atlas-recent-title">Recently opened</p>
                  <div className="atlas-quick">
                    {recent.map((p) => (
                      <button key={toKey(p)} type="button" className="atlas-chip" onClick={() => { select(p, true); }}>
                        {parseNode(p.node).name}
                        {parseNode(p.node).side ? ` (${sideShort(parseNode(p.node).side)})` : ""}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <p className="atlas-keys">
                <kbd>/</kbd> search · <kbd>F</kbd> focus · <kbd>H</kbd> hide · <kbd>O</kbd> only this · <kbd>A</kbd> show all · <kbd>1</kbd>–<kbd>5</kbd> views ·{" "}
                <kbd>0</kbd> whole body · <kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> turn · <kbd>Shift</kbd> + arrows move · <kbd>+</kbd> <kbd>−</kbd> zoom · <kbd>Backspace</kbd> back ·{" "}
                <kbd>Esc</kbd> let go
              </p>
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
