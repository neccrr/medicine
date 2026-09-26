import { describe, expect, it } from "vitest";
import {
  cleanDisplayName,
  computeStats,
  MemoryLeaderboardStore,
  rankBoard,
  scoreFor,
  updateDoc,
  type LeaderboardDoc,
} from "./leaderboard.js";

const NOW = Date.parse("2026-09-26T12:00:00Z");
const card = (reps: number) => ({ interval: 1, easeFactor: 2.5, dueDate: "2026-10-01", reps, lapses: 0 });
const base = { userId: "u1", displayName: "Alice", cohort: "2025" };

describe("computeStats", () => {
  it("counts correct answers, learned cards, finished chapters and study days", () => {
    const { stats, runEnd, runLength } = computeStats(
      [
        { key: "medicine:flashcards:1.2/anatomy", value: { a: card(2), b: card(0), c: card(1) } },
        { key: "medicine:quiz:1.2/anatomy", value: [{ score: 7, total: 10 }, { score: 9, total: 10 }] },
        { key: "medicine:examhistory:1.1", value: [{ score: 60, total: 100 }] },
        { key: "medicine:ebookdone:1.2/anatomy", value: ["chapter-01", "chapter-02", "chapter-01"] },
        { key: "medicine:activity", value: ["2026-09-20", "2026-09-24", "2026-09-25", "2026-09-26"] },
        { key: "medicine:quizdue:1.2/anatomy", value: ["q1"] },
      ],
      NOW,
    );
    expect(stats).toEqual({ correctAnswers: 76, cardsLearned: 2, chaptersFinished: 2, studyDays: 4, points: 76 + 4 + 20 + 20 });
    expect([runEnd, runLength]).toEqual(["2026-09-26", 3]);
  });

  it("ignores impossible values", () => {
    const { stats } = computeStats(
      [
        { key: "medicine:quiz:1.1/biochem", value: [{ score: 11, total: 10 }, { score: 1e9, total: 1e9 }, "junk"] },
        { key: "medicine:activity", value: ["2099-01-01", "not a date", "2026-09-26"] },
        { key: "medicine:flashcards:1.1/biochem", value: { a: { reps: -3 }, b: { reps: 1.5 } } },
      ],
      NOW,
    );
    expect(stats).toMatchObject({ correctAnswers: 0, studyDays: 1, cardsLearned: 0 });
  });
});

describe("updateDoc and scores", () => {
  const stats = (points: number) => ({ stats: { points, correctAnswers: 0, cardsLearned: 0, chaptersFinished: 0, studyDays: 0 }, runEnd: "2026-09-25", runLength: 4 });

  it("sets a baseline first, then credits gains to the day they synced", () => {
    const first = updateDoc(null, base, stats(500), NOW);
    expect(first.daily).toEqual({});
    const second = updateDoc({ ...first, joined: true }, base, stats(530), NOW);
    expect(second.daily).toEqual({ "2026-09-26": 30 });
    expect(second.joined).toBe(true);
    // Losing points (a reset card) doesn't subtract from the week.
    expect(updateDoc(second, base, stats(520), NOW).daily).toEqual({ "2026-09-26": 30 });
  });

  it("adds up the last seven days and drops a streak that has lapsed", () => {
    const doc: LeaderboardDoc = {
      ...updateDoc(null, base, stats(100), NOW),
      daily: { "2026-09-26": 5, "2026-09-20": 7, "2026-09-19": 100 },
    };
    expect(scoreFor(doc, "week", NOW)).toBe(12);
    expect(scoreFor(doc, "all", NOW)).toBe(100);
    expect(scoreFor(doc, "streak", NOW)).toBe(4);
    expect(scoreFor(doc, "streak", NOW + 2 * 86_400_000)).toBe(0);
  });
});

describe("rankBoard", () => {
  const doc = (userId: string, displayName: string, points: number, joined = true, cohort = "2025"): LeaderboardDoc => ({
    ...updateDoc(null, { userId, displayName, cohort }, { stats: { points, correctAnswers: 0, cardsLearned: 0, chaptersFinished: 0, studyDays: 0 }, runEnd: null, runLength: 0 }, NOW),
    joined,
  });

  it("shares ranks on ties, hides zero scores and students who didn't join", () => {
    const rows = rankBoard(
      [doc("a", "Ana", 50), doc("b", "Budi", 80), doc("c", "Cici", 50), doc("d", "Dewi", 0), doc("e", "Eka", 99, false)],
      { period: "all", userId: "c", now: NOW },
    );
    expect(rows.map((r) => [r.rank, r.name, r.me])).toEqual([
      [1, "Budi", false],
      [2, "Ana", false],
      [2, "Cici", true],
    ]);
  });

  it("filters by cohort", () => {
    const rows = rankBoard([doc("a", "Ana", 5, true, "2024"), doc("b", "Budi", 8)], { period: "all", cohort: "2024", userId: "a", now: NOW });
    expect(rows.map((r) => r.name)).toEqual(["Ana"]);
  });
});

describe("cleanDisplayName", () => {
  it("trims, collapses spaces and enforces a length", () => {
    expect(cleanDisplayName("  Siti \n Aminah ")).toBe("Siti Aminah");
    expect(cleanDisplayName("A")).toBeNull();
    expect(cleanDisplayName("x".repeat(33))).toBeNull();
    expect(cleanDisplayName(42)).toBeNull();
  });
});

describe("MemoryLeaderboardStore", () => {
  it("keeps membership when a recount computed before a join is saved after it", async () => {
    const store = new MemoryLeaderboardStore();
    const computed = { stats: { points: 10, correctAnswers: 0, cardsLearned: 0, chaptersFinished: 0, studyDays: 2 }, runEnd: null, runLength: 0 };
    await store.saveStats(updateDoc(null, base, computed, NOW));
    const staleRecount = updateDoc(await store.get("u1"), base, { ...computed, stats: { ...computed.stats, points: 15 } }, NOW);
    await store.setMembership("u1", { joined: true, displayName: "Ali" });
    await store.saveStats(staleRecount);
    expect(await store.get("u1")).toMatchObject({ joined: true, displayName: "Ali", stats: { points: 15 } });
  });
});
