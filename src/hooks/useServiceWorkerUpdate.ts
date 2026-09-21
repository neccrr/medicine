import { useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";

/**
 * Registers the service worker and surfaces when a new version has finished
 * downloading in the background. Update installs are never forced — a quiz
 * or timed exam in progress shouldn't get yanked out from under the user —
 * the caller decides when to actually reload.
 */
export function useServiceWorkerUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const updateRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    updateRef.current = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      // Re-check periodically so a tab left open overnight still notices a
      // deploy — the browser's own SW update check alone is too infrequent.
      onRegisteredSW(_url, registration) {
        if (!registration) return;
        const CHECK_INTERVAL_MS = 60 * 60 * 1000;
        window.setInterval(() => registration.update(), CHECK_INTERVAL_MS);
      },
    });
  }, []);

  const applyUpdate = () => {
    updateRef.current?.(true);
  };

  return { needRefresh, applyUpdate };
}
