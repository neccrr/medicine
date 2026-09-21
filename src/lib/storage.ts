export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
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

export const STORAGE_KEYS = {
  cardState: (deckId: string) => `medicine:flashcards:${deckId}`,
  tagFilter: (deckId: string) => `medicine:tagfilter:${deckId}`,
  quizProgress: (quizId: string) => `medicine:quiz:${quizId}`,
  quizDue: (quizId: string) => `medicine:quizdue:${quizId}`,
  quizInProgress: (quizId: string) => `medicine:quizinprogress:${quizId}`,
  examHistory: (subjectId: string) => `medicine:examhistory:${subjectId}`,
  examMode: "medicine:exammode",
  lastRead: (subjectId: string) => `medicine:lastread:${subjectId}`,
  ebookPosition: (subjectId: string) => `medicine:ebook:${subjectId}`,
  ebookCompleted: (subjectId: string) => `medicine:ebookdone:${subjectId}`,
  examDate: (subjectId: string) => `medicine:examdate:${subjectId}`,
  readingPrefs: "medicine:readingprefs",
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
