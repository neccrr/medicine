import { describe, expect, it } from "vitest";
import {
  ebookSubjects,
  flashcardSubjects,
  moduleSubjects,
  quizSubjects,
  subjectBlockCollisions,
  summarySubjects,
} from "./content";
import { studyBlocks } from "./blocks";

describe("content folders", () => {
  it("never put the same subject in two blocks for one content type", () => {
    // Flashcard/quiz/ebook/summary maps are keyed by subject id alone, so two blocks can't
    // both have e.g. a physiology flashcard deck until those maps are keyed by block too.
    expect(subjectBlockCollisions).toEqual([]);
  });

  it("only use configured block ids", () => {
    const known = new Set(studyBlocks.map((b) => b.id));
    const all = [...flashcardSubjects, ...quizSubjects, ...ebookSubjects, ...summarySubjects, ...moduleSubjects];
    expect(all.filter((s) => !known.has(s.blockId))).toEqual([]);
  });
});
