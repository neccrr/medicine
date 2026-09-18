import { useEffect, useState } from "react";
import { readJSON, writeJSON } from "../lib/storage";

/**
 * localStorage-backed state, safe to use with a key that changes across
 * renders (e.g. a subject id from useParams) — client-side routing reuses
 * the same component instance across param changes, so without this the
 * previous subject's value would leak into the new one on first render.
 */
export function useLocalStorage<T>(key: string, fallback: T) {
  const [trackedKey, setTrackedKey] = useState(key);
  const [value, setValue] = useState<T>(() => readJSON(key, fallback));

  if (key !== trackedKey) {
    setTrackedKey(key);
    setValue(readJSON(key, fallback));
  }

  useEffect(() => {
    writeJSON(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}
