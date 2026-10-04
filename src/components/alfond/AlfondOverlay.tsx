import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAccount } from "../../hooks/useAccount";
import { OPEN_ALFOND_EVENT, useAlfond, useAlfondPrefs } from "../../lib/alfond";
import { AlfondIcon } from "../icons";

// The chat itself loads the first time it's opened, so the button costs next to nothing.
const AlfondPanel = lazy(() => import("./AlfondPanel").then((m) => ({ default: m.AlfondPanel })));

/**
 * Alfond's floating button and chat window, on every page except Alfond's own. Hidden when the
 * site has no AI, or when the student has turned it off (Alfond page or Account).
 */
export function AlfondOverlay() {
  const { config } = useAccount();
  const [prefs] = useAlfondPrefs();
  const { busy } = useAlfond();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const enabled = config?.ai === true && prefs.overlay !== false && pathname !== "/alfond";

  // "Ask Alfond" buttons elsewhere open the window.
  useEffect(() => {
    const show = () => { setOpen(true); };
    window.addEventListener(OPEN_ALFOND_EVENT, show);
    return () => { window.removeEventListener(OPEN_ALFOND_EVENT, show); };
  }, []);

  useEffect(() => {
    if (!open || !enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      setOpen(false);
      button.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); };
  }, [open, enabled]);

  if (!enabled) return null;
  return (
    <>
      {open && (
        <Suspense fallback={null}>
          <AlfondPanel onClose={() => { setOpen(false); }} />
        </Suspense>
      )}
      <button
        ref={button}
        type="button"
        className={`alfond-fab${open ? " open" : ""}${busy && !open ? " busy" : ""}`}
        onClick={() => { setOpen((o) => !o); }}
        aria-expanded={open}
        aria-controls={open ? "alfond-panel" : undefined}
        aria-label={open ? "Close Alfond" : "Ask Alfond about this page"}
        title={open ? "Close Alfond" : "Ask Alfond"}
      >
        <AlfondIcon />
      </button>
    </>
  );
}
