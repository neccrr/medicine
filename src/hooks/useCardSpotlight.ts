import { useEffect } from "react";

/** Pointer-following glow on `.nav-card` elements, tracked via CSS custom properties. */
export function useCardSpotlight() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const card = (e.target as HTMLElement | null)?.closest?.(".nav-card") as HTMLElement | null;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--spot-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
      card.style.setProperty("--spot-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
    };
    document.addEventListener("pointermove", onMove);
    return () => document.removeEventListener("pointermove", onMove);
  }, []);
}
