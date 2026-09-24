export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    // A stored literal "null" parses successfully but isn't the shape callers expect
    // (a CardStateMap, an array, ...) — treat it the same as a missing key, unless the
    // caller's own fallback is null/undefined too (e.g. QuizPlay's in-progress-save slot).
    if (parsed === null || parsed === undefined) {
      return fallback === null || fallback === undefined ? (parsed as T) : fallback;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage unavailable (private browsing, quota exceeded, etc.) — fail silently.
  }
}

// Per-subject keys take a subject key, "{blockId}/{subjectId}" (see subjectKey in content.ts).
export const STORAGE_KEYS = {
  cardState: (key: string) => `medicine:flashcards:${key}`,
  tagFilter: (key: string) => `medicine:tagfilter:${key}`,
  quizProgress: (key: string) => `medicine:quiz:${key}`,
  quizDue: (key: string) => `medicine:quizdue:${key}`,
  quizInProgress: (key: string) => `medicine:quizinprogress:${key}`,
  /** Keyed by block id, or "{blockId}/{packageId}" for one exam package. */
  examHistory: (id: string) => `medicine:examhistory:${id}`,
  examMode: "medicine:exammode",
  lastRead: (key: string) => `medicine:lastread:${key}`,
  ebookPosition: (key: string) => `medicine:ebook:${key}`,
  ebookCompleted: (key: string) => `medicine:ebookdone:${key}`,
  examDate: (key: string) => `medicine:examdate:${key}`,
  readingPrefs: "medicine:readingprefs",
  sidebarCollapsed: "medicine:sidebarcollapsed",
  lastExport: "medicine:lastexport",
  theme: "medicine:theme",
  activity: "medicine:activity",
} as const;

const PREFIX = "medicine:";

/** Collect every app-owned localStorage key/value pair, for export. */
export function exportAllProgress(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(PREFIX)) continue;
    try {
      out[key] = JSON.parse(window.localStorage.getItem(key) ?? "null");
    } catch {
      // skip unparsable entries
    }
  }
  return out;
}

/** Restore a previously exported progress snapshot, overwriting existing keys. */
export function importAllProgress(data: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(data)) {
    if (!key.startsWith(PREFIX)) continue;
    writeJSON(key, value);
  }
}
