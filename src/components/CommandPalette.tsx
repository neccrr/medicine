import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Fuse from "fuse.js";
import { buildNavigationDocs, type SearchDoc } from "../lib/searchIndex";

export const OPEN_COMMAND_PALETTE_EVENT = "medicine:open-command-palette";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const docs = useMemo(() => buildNavigationDocs(), []);
  const fuse = useMemo(
    () => new Fuse(docs, { keys: ["title", "detail"], threshold: 0.4 }),
    [docs],
  );

  const results: SearchDoc[] = query.trim()
    ? fuse.search(query).slice(0, 8).map((r) => r.item)
    : docs.filter((d) => d.type === "page").slice(0, 8);

  const openPalette = () => {
    setQuery("");
    setActiveIndex(0);
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) {
          setOpen(false);
        } else {
          openPalette();
        }
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpenEvent = () => openPalette();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const go = (doc: SearchDoc) => {
    navigate(doc.to);
    setOpen(false);
  };

  const onQueryChange = (value: string) => {
    setQuery(value);
    setActiveIndex(0);
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[activeIndex]) go(results[activeIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="command-overlay" onClick={() => setOpen(false)}>
      <div
        className="command-palette"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <input
          ref={inputRef}
          className="command-input"
          placeholder="Jump to a page or subject..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={onInputKeyDown}
          aria-label="Command palette search"
        />
        <ul className="command-results">
          {results.map((doc, i) => (
            <li key={`${doc.type}-${doc.id}`}>
              <button
                className={i === activeIndex ? "command-item active" : "command-item"}
                onClick={() => go(doc)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span className="command-item-type">{doc.type}</span>
                <span className="command-item-title">{doc.title}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="command-empty">No matches.</li>}
        </ul>
        <div className="command-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>Enter</kbd> select
          </span>
          <span>
            <kbd>Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
