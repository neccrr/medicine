import type { Collection, Db } from "mongodb";

// The leaderboard ranks students who opted in, by points worked out on the server from their
// synced progress (never a score the browser reports). Progress lives in the browser first,
// so this is honour-based; the caps below keep a malformed or hand-edited value from
// producing an absurd score.

/** How points are earned. The Leaderboard page shows the same table. */
export const POINTS = {
  correctAnswer: 1,
  cardLearned: 2,
  chapterFinished: 10,
  studyDay: 5,
} as const;

export interface LeaderboardStats {
  points: number;
  /** Correct answers across every quiz and exam attempt. */
  correctAnswers: number;
  /** Flashcards reviewed successfully at least once (SM-2 reps ≥ 1). */
  cardsLearned: number;
  chaptersFinished: number;
  studyDays: number;
}

export interface LeaderboardDoc {
  userId: string;
  joined: boolean;
  displayName: string;
  cohort: string | null;
  stats: LeaderboardStats;
  /** The latest run of consecutive study days: its last day (UTC date) and length. */
  runEnd: string | null;
  runLength: number;
  /** Points gained per UTC day over the last two weeks, for the weekly board. */
  daily: Record<string, number>;
  updatedAt: number;
}

export type Period = "week" | "all" | "streak";

const DAY_MS = 86_400_000;
const DAILY_KEEP_DAYS = 14;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isInt = (v: unknown, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;

/** Keys whose changes can move a student's score. */
export function affectsLeaderboard(key: string): boolean {
  return /^medicine:(flashcards|quiz|examhistory|ebookdone):|^medicine:activity$/.test(key);
}

/** Totals from one student's synced progress entries. */
export function computeStats(entries: { key: string; value: unknown }[], now = Date.now()): {
  stats: LeaderboardStats;
  runEnd: string | null;
  runLength: number;
} {
  let correctAnswers = 0;
  let cardsLearned = 0;
  let chaptersFinished = 0;
  let days: string[] = [];
  const latestDay = utcDay(now + DAY_MS);

  for (const { key, value } of entries) {
    if (key.startsWith("medicine:flashcards:") && isRecord(value)) {
      cardsLearned += Object.values(value)
        .slice(0, 5000)
        .filter((c) => isRecord(c) && isInt(c.reps, 10_000) && c.reps >= 1).length;
    } else if (/^medicine:(quiz|examhistory):/.test(key) && Array.isArray(value)) {
      for (const a of value.slice(0, 1000)) {
        if (isRecord(a) && isInt(a.total, 500) && isInt(a.score, a.total)) correctAnswers += a.score;
      }
    } else if (key.startsWith("medicine:ebookdone:") && Array.isArray(value)) {
      chaptersFinished += new Set(value.filter((id) => typeof id === "string" && id.length <= 60)).size;
    } else if (key === "medicine:activity" && Array.isArray(value)) {
      days = value.filter((d): d is string => typeof d === "string" && DATE_RE.test(d) && d >= "2020-01-01" && d <= latestDay);
    }
  }

  const sorted = [...new Set(days)].sort();
  let runLength = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const expected = utcDay(Date.parse(sorted[sorted.length - 1]) - runLength * DAY_MS);
    if (sorted[i] !== expected) break;
    runLength += 1;
  }

  const studyDays = sorted.length;
  return {
    stats: {
      points:
        correctAnswers * POINTS.correctAnswer +
        cardsLearned * POINTS.cardLearned +
        chaptersFinished * POINTS.chapterFinished +
        studyDays * POINTS.studyDay,
      correctAnswers,
      cardsLearned,
      chaptersFinished,
      studyDays,
    },
    runEnd: sorted.at(-1) ?? null,
    runLength,
  };
}

/**
 * The student's leaderboard record after a recount. Points gained since the last recount are
 * credited to today, which is what the weekly board adds up. A student's first recount only
 * sets the baseline, so progress made before joining (or as a guest) doesn't all land on one day.
 */
export function updateDoc(
  prev: LeaderboardDoc | null,
  base: { userId: string; displayName: string; cohort: string | null },
  computed: ReturnType<typeof computeStats>,
  now = Date.now(),
): LeaderboardDoc {
  const daily: Record<string, number> = {};
  const oldest = utcDay(now - (DAILY_KEEP_DAYS - 1) * DAY_MS);
  for (const [day, pts] of Object.entries(prev?.daily ?? {})) if (day >= oldest) daily[day] = pts;
  if (prev) {
    const gained = computed.stats.points - prev.stats.points;
    if (gained > 0) daily[utcDay(now)] = (daily[utcDay(now)] ?? 0) + gained;
  }
  return {
    userId: base.userId,
    joined: prev?.joined ?? false,
    displayName: prev?.displayName ?? base.displayName,
    cohort: base.cohort,
    stats: computed.stats,
    runEnd: computed.runEnd,
    runLength: computed.runLength,
    daily,
    updatedAt: now,
  };
}

/** A student's score on one board. */
export function scoreFor(doc: LeaderboardDoc, period: Period, now = Date.now()): number {
  if (period === "all") return doc.stats.points;
  if (period === "streak") {
    // A run still counts if its last day was today or yesterday (UTC), or "tomorrow" for
    // students east of UTC whose local date is ahead.
    const alive = doc.runEnd !== null && doc.runEnd >= utcDay(now - DAY_MS);
    return alive ? doc.runLength : 0;
  }
  const since = utcDay(now - 6 * DAY_MS);
  return Object.entries(doc.daily).reduce((sum, [day, pts]) => (day >= since ? sum + pts : sum), 0);
}

export interface BoardRow {
  rank: number;
  name: string;
  cohort: string | null;
  value: number;
  me: boolean;
}

/** Ranks joined students with a score above zero; ties share a rank (1, 2, 2, 4). */
export function rankBoard(
  docs: LeaderboardDoc[],
  { period, cohort, userId, now = Date.now() }: { period: Period; cohort?: string | null; userId: string; now?: number },
): BoardRow[] {
  const rows = docs
    .filter((d) => d.joined && (!cohort || d.cohort === cohort))
    .map((d) => ({ name: d.displayName, cohort: d.cohort, value: scoreFor(d, period, now), me: d.userId === userId }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  let rank = 0;
  return rows.map((r, i) => {
    if (i === 0 || r.value !== rows[i - 1].value) rank = i + 1;
    return { rank, ...r };
  });
}

/** Trims and checks a display name; returns null when it isn't acceptable. */
export function cleanDisplayName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const printable = [...input].filter((ch) => ch >= " " && ch !== "\u007f").join("");
  const name = printable.replace(/\s+/g, " ").trim();
  return name.length >= 2 && name.length <= 32 ? name : null;
}

export type Membership = Pick<LeaderboardDoc, "joined" | "displayName">;

export interface LeaderboardStore {
  get(userId: string): Promise<LeaderboardDoc | null>;
  /**
   * Writes a recount. Membership (joined, display name) is only set when the record is new, so a
   * recount racing a join or rename can't undo it.
   */
  saveStats(doc: LeaderboardDoc): Promise<void>;
  setMembership(userId: string, patch: Partial<Membership>): Promise<void>;
  /** Every student who joined the board. */
  joined(): Promise<LeaderboardDoc[]>;
  delete(userId: string): Promise<void>;
}

const MAX_BOARD = 5000;

export class MongoLeaderboardStore implements LeaderboardStore {
  private readonly col: Collection<LeaderboardDoc>;
  private indexes: Promise<unknown> | null = null;

  constructor(db: Db) {
    this.col = db.collection<LeaderboardDoc>("leaderboard");
  }

  private ready() {
    this.indexes ??= this.col.createIndexes([
      { key: { userId: 1 }, unique: true, name: "user" },
      { key: { joined: 1 }, name: "joined" },
    ]);
    return this.indexes;
  }

  async get(userId: string) {
    await this.ready();
    return this.col.findOne({ userId }, { projection: { _id: 0 } });
  }

  async saveStats(doc: LeaderboardDoc) {
    await this.ready();
    const { joined, displayName, ...stats } = doc;
    await this.col.updateOne({ userId: doc.userId }, { $set: stats, $setOnInsert: { joined, displayName } }, { upsert: true });
  }

  async setMembership(userId: string, patch: Partial<Membership>) {
    await this.ready();
    await this.col.updateOne({ userId }, { $set: patch });
  }

  async joined() {
    await this.ready();
    return this.col.find({ joined: true }, { projection: { _id: 0 } }).limit(MAX_BOARD).toArray();
  }

  async delete(userId: string) {
    await this.col.deleteOne({ userId });
  }
}

/** In-memory store for tests and the local dev server. */
export class MemoryLeaderboardStore implements LeaderboardStore {
  private readonly docs = new Map<string, LeaderboardDoc>();

  async get(userId: string) {
    const d = this.docs.get(userId);
    return d ? structuredClone(d) : null;
  }

  async saveStats(doc: LeaderboardDoc) {
    const prev = this.docs.get(doc.userId);
    const membership = prev ? { joined: prev.joined, displayName: prev.displayName } : {};
    this.docs.set(doc.userId, { ...structuredClone(doc), ...membership });
  }

  async setMembership(userId: string, patch: Partial<Membership>) {
    const prev = this.docs.get(userId);
    if (prev) this.docs.set(userId, { ...prev, ...patch });
  }

  async joined() {
    return [...this.docs.values()].filter((d) => d.joined).map((d) => structuredClone(d));
  }

  async delete(userId: string) {
    this.docs.delete(userId);
  }
}
