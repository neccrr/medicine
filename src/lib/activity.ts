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
export function getCurrentStreak(days: string[] = getActivityDays(), now: Date = new Date()): number {
  if (days.length === 0) return 0;
  const daySet = new Set(days);
  const today = new Date(now);
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

// ---------------------------------------------------------------------------------------------
// The study log: how much was studied each day, per subject, for the heatmap's shading, the
// trend charts and today's plan ticking itself off.

export type StudyKind = "cards" | "labels" | "questions" | "chapters" | "exams";

/** Counts for one day: by subject key ("1.2/anatomy"), or "block:1.2" for a block's exams. */
export type DayLog = Partial<Record<string, Partial<Record<StudyKind, number>>>>;

export interface StudyLog {
  /** By local date ("YYYY-MM-DD" in the student's own time zone). */
  days: Record<string, DayLog>;
  /** Actions by local hour of day ("0"–"23"), for "you study best at…". */
  hours: Record<string, number>;
}

/** About a year of days is kept; older ones only matter to the study-day streaks. */
const LOG_DAYS = 400;

export function getStudyLog(): StudyLog {
  const log = readJSON<Partial<StudyLog>>(STORAGE_KEYS.studyLog, {});
  return { days: log.days && typeof log.days === "object" ? log.days : {}, hours: log.hours && typeof log.hours === "object" ? log.hours : {} };
}

/** Records `n` of something studied now, in a subject (or "block:{id}" for exams). */
export function logStudy(subject: string, kind: StudyKind, n = 1, at: Date = new Date()): void {
  if (!(n > 0)) return;
  const log = getStudyLog();
  const day = localDateKey(at);
  const today = (log.days[day] ??= {});
  const counts = (today[subject] ??= {});
  counts[kind] = (counts[kind] ?? 0) + n;
  const hour = String(at.getHours());
  log.hours[hour] = (log.hours[hour] ?? 0) + n;
  const keep = Object.keys(log.days).sort().slice(-LOG_DAYS);
  if (keep.length < Object.keys(log.days).length) log.days = Object.fromEntries(keep.map((d) => [d, log.days[d]]));
  writeJSON(STORAGE_KEYS.studyLog, log);
}

/** One day's totals by kind, across subjects (optionally only those matching `subject`). */
export function dayTotals(log: StudyLog, day: string, subject?: (key: string) => boolean): Record<StudyKind, number> {
  const out: Record<StudyKind, number> = { cards: 0, labels: 0, questions: 0, chapters: 0, exams: 0 };
  for (const [key, counts] of Object.entries(log.days[day] ?? {})) {
    if (subject && !subject(key)) continue;
    for (const kind of Object.keys(out) as StudyKind[]) out[kind] += Number(counts?.[kind]) || 0;
  }
  return out;
}

/** "YYYY-MM-DD" of a date in the local time zone. */
export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
