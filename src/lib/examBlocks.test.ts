import { describe, expect, it } from "vitest";
import { buildBlockOptions } from "./examBlocks";

describe("buildBlockOptions", () => {
  it("returns nothing for an empty bank", () => {
    expect(buildBlockOptions(0)).toEqual([]);
  });

  it("offers just the full bank when it's small", () => {
    const options = buildBlockOptions(8);
    expect(options.map((o) => o.count)).toEqual([8]);
    expect(options[0].questionLabel).toBe("All 8 questions");
  });

  it("skips a candidate size too close to the full bank size", () => {
    // 42: 40 is within the 5-question gap, so it's dropped; 10/20 remain.
    const options = buildBlockOptions(42);
    expect(options.map((o) => o.count)).toEqual([10, 20, 42]);
  });

  it("offers a graduated set of sizes for a large bank", () => {
    const options = buildBlockOptions(170);
    expect(options.map((o) => o.count)).toEqual([10, 20, 40, 80, 170]);
  });

  it("always ends with the full bank size, labeled distinctly", () => {
    const options = buildBlockOptions(170);
    const last = options[options.length - 1];
    expect(last.count).toBe(170);
    expect(last.questionLabel).toBe("All 170 questions");
  });

  it("computes time limit at 90 seconds per question", () => {
    const options = buildBlockOptions(170);
    const forty = options.find((o) => o.count === 40)!;
    expect(forty.timeLimitSec).toBe(40 * 90);
    expect(forty.durationLabel).toBe("1 hr");
  });

  it("formats durations over an hour with hours and minutes", () => {
    const options = buildBlockOptions(170);
    const full = options[options.length - 1];
    expect(full.timeLimitSec).toBe(170 * 90);
    expect(full.durationLabel).toBe("4 hr 15 min");
  });
});
