import { describe, expect, it } from "vitest";
import {
  ebookChapters,
  ebookSubjects,
  flashcardDecks,
  flashcardSubjects,
  keyOf,
  moduleSubjects,
  quizBanks,
  quizSubjects,
  summaries,
  summarySubjects,
} from "./content";
import { studyBlocks } from "./blocks";

describe("content folders", () => {
  it("only use configured block ids", () => {
    const known = new Set(studyBlocks.map((b) => b.id));
    const all = [...flashcardSubjects, ...quizSubjects, ...ebookSubjects, ...summarySubjects, ...moduleSubjects];
    expect(all.filter((s) => !known.has(s.blockId))).toEqual([]);
  });

  it("keys every content map by block and subject", () => {
    const keys = [
      ...Object.keys(flashcardDecks),
      ...Object.keys(quizBanks),
      ...Object.keys(summaries),
      ...Object.keys(ebookChapters).map((k) => k.split("/").slice(0, 2).join("/")),
    ];
    expect(keys.filter((k) => !/^[^/]+\/[^/]+$/.test(k))).toEqual([]);
    for (const s of flashcardSubjects) expect(flashcardDecks[keyOf(s)]?.length).toBeGreaterThan(0);
  });

  it("uses unique flashcard and quiz ids across all decks", () => {
    // Card state and missed-question lists are stored by id, so an id reused across decks
    // would share progress.
    const cardIds = Object.values(flashcardDecks).flat().map((c) => c.id);
    const questionIds = Object.values(quizBanks).flat().map((q) => q.id);
    expect(cardIds.filter((id, i) => cardIds.indexOf(id) !== i)).toEqual([]);
    expect(questionIds.filter((id, i) => questionIds.indexOf(id) !== i)).toEqual([]);
  });
});
