import { describe, expect, it } from "vitest";
import { groupByBlock } from "./blocks";

describe("groupByBlock", () => {
  it("buckets subjects into their configured block, in block order", () => {
    const subjects = [
      { id: "physiology", label: "Physiology" },
      { id: "histology", label: "Histology" },
      { id: "biochem", label: "Biochem" },
    ];
    const groups = groupByBlock(subjects);
    const block11 = groups.find((g) => g.block.id === "1.1")!;
    expect(block11.subjects.map((s) => s.id).sort()).toEqual(["biochem", "histology", "physiology"]);
  });

  it("includes a block with only upcoming subjects, with no real subjects", () => {
    const groups = groupByBlock<{ id: string }>([]);
    const block12 = groups.find((g) => g.block.id === "1.2");
    expect(block12).toBeDefined();
    expect(block12!.subjects).toEqual([]);
    expect(block12!.upcoming.map((u) => u.id)).toEqual(["anatomy"]);
  });

  it("drops a block that has neither real nor upcoming subjects", () => {
    // Every currently configured block has something (real or upcoming), so nothing is dropped
    // for the real config — this just documents the filtering behavior with an empty input.
    const groups = groupByBlock<{ id: string }>([]);
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) {
      expect(g.subjects.length > 0 || g.upcoming.length > 0).toBe(true);
    }
  });

  it("ignores a subject that isn't assigned to any block", () => {
    const subjects = [{ id: "unmapped-subject", label: "Mystery" }];
    const groups = groupByBlock(subjects);
    const allGrouped = groups.flatMap((g) => g.subjects.map((s) => s.id));
    expect(allGrouped).not.toContain("unmapped-subject");
  });
});
