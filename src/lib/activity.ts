import { readJSON, writeJSON, STORAGE_KEYS } from "./storage";

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Marks today as a study day. Cheap to call repeatedly — dedupes automatically. */
export function recordActivity(date: Date = new Date()): void {
  const key = toDateKey(date);
  const days = readJSON<string[]>(STORAGE_KEYS.activity, []);
  if (days.includes(key)) return;
  writeJSON(STORAGE_KEYS.activity, [...days, key].sort());
}

export function getActivityDays(): string[] {
  return readJSON<string[]>(STORAGE_KEYS.activity, []);
}

/** Current streak of consecutive study days, counting back from today (or yesterday, so today isn't required yet). */
export function getCurrentStreak(days: string[] = getActivityDays()): number {
  if (days.length === 0) return 0;
  const daySet = new Set(days);
  const today = new Date();
  let cursor = new Date(today);

  if (!daySet.has(toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!daySet.has(toDateKey(cursor))) return 0;
  }

  let streak = 0;
  while (daySet.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function getLongestStreak(days: string[] = getActivityDays()): number {
  if (days.length === 0) return 0;
  const sorted = [...days].sort();
  let longest = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / 86_400_000,
    );
    current = diffDays === 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
  }
  return longest;
}
