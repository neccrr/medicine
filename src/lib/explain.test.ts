import { describe, expect, it } from "vitest";
import { findNotes } from "./explain";

describe("findNotes", () => {
  it("finds the notes passages that share a question's key terms", async () => {
    const notes = await findNotes("1.2/anatomy", "Which bone is a sesamoid bone? Patella");
    expect(notes.length).toBeGreaterThan(0);
    expect(notes.some((n) => /sesamoid/i.test(n.text))).toBe(true);
    for (const n of notes) expect(n.to).toMatch(/^\/(ebooks|summaries)\/1\.2\/anatomy/);
  });

  it("returns nothing for a subject without notes or a question without words", async () => {
    expect(await findNotes("9.9/nothing", "anything here")).toEqual([]);
    expect(await findNotes("1.2/anatomy", "? ? 1 2")).toEqual([]);
  });
});
