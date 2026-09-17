import { useEffect, useState } from "react";
import { readJSON, writeJSON } from "../lib/storage";

export function useLocalStorage<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readJSON(key, fallback));

  useEffect(() => {
    writeJSON(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}
