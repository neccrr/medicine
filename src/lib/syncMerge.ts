// Rules for combining two copies of one progress entry (a `medicine:*` localStorage key), used
// by the sync server when a device uploads a change and by the browser when a download races a
// local edit. Pure and import-free so the server can load it without the app's module graph.

export interface SyncEntry {
  key: string;
  value: unknown;
  /** When this copy was last changed, in ms since the epoch (the changing device's clock). */
  updatedAt: number;
}

/** Keys that stay on one device: UI state, sync bookkeeping, and bulky mid-quiz snapshots. */
export function isSyncableKey(key: string): boolean {
  if (!/^medicine:[a-z]+(?::[A-Za-z0-9._/-]{1,160})?$/.test(key)) return false;
  return !/^medicine:(theme|lastexport|sidebarcollapsed|sync|quizinprogress)(:|$)/.test(key);
}

type CardLike = { reps?: unknown; dueDate?: unknown };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Per card, keep the copy that has been reviewed more often (then the later due date). */
function mergeCardStates(a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...a };
  for (const [id, incoming] of Object.entries(b)) {
    const current = out[id] as CardLike | undefined;
    const next = incoming as CardLike;
    if (!current) {
      out[id] = incoming;
      continue;
    }
    const cr = typeof current.reps === "number" ? current.reps : -1;
    const nr = typeof next.reps === "number" ? next.reps : -1;
    if (nr > cr || (nr === cr && String(next.dueDate ?? "") > String(current.dueDate ?? ""))) out[id] = incoming;
  }
  return out;
}

/** Quiz and exam attempt logs: union of both, oldest first, without duplicates. */
function mergeAttemptLists(a: unknown[], b: unknown[]): unknown[] {
  const seen = new Map<string, unknown>();
  for (const item of [...a, ...b]) {
    const r = isRecord(item) ? item : {};
    const id = JSON.stringify([r.date, r.score, r.total, r.timeTakenSec]);
    if (!seen.has(id)) seen.set(id, item);
  }
  return [...seen.values()].sort((x, y) =>
    String(isRecord(x) ? x.date : "").localeCompare(String(isRecord(y) ? y.date : "")),
  );
}

function mergeStringSets(a: unknown[], b: unknown[]): string[] {
  return [...new Set([...a, ...b].filter((x): x is string => typeof x === "string"))].sort();
}

/**
 * Combines two copies of the same key. Progress that only grows (card reviews, attempt logs,
 * study days, finished chapters) is merged so nothing studied on either device is lost; every
 * other key goes to the most recently changed copy, with `incoming` winning ties.
 */
export function mergeEntry(current: SyncEntry, incoming: SyncEntry): SyncEntry {
  const key = incoming.key;
  const updatedAt = Math.max(current.updatedAt, incoming.updatedAt);
  const a = current.value;
  const b = incoming.value;
  const newer = incoming.updatedAt >= current.updatedAt ? incoming : current;

  if (/^medicine:flashcards:/.test(key) && isRecord(a) && isRecord(b)) {
    return { key, value: mergeCardStates(a, b), updatedAt };
  }
  if (/^medicine:(quiz|examhistory):/.test(key) && Array.isArray(a) && Array.isArray(b)) {
    return { key, value: mergeAttemptLists(a, b), updatedAt };
  }
  if (/^medicine:(activity$|ebookdone:)/.test(key) && Array.isArray(a) && Array.isArray(b)) {
    return { key, value: mergeStringSets(a, b), updatedAt };
  }
  if (/^medicine:ebook:/.test(key) && isRecord(a) && isRecord(b)) {
    // A reading position carries its own timestamp; the later position wins.
    const later = String(b.updatedAt ?? "") >= String(a.updatedAt ?? "") ? b : a;
    return { key, value: later, updatedAt };
  }
  return { key, value: newer.value, updatedAt };
}
