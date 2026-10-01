import { describe, expect, it } from "vitest";
import { occlusionCards, zoomBox } from "./occlusion";
import type { OcclusionNote } from "../types/content";

const note: OcclusionNote = {
  id: "c1-p1",
  image: "/x.webp",
  width: 1000,
  height: 800,
  title: "Figure",
  region: "trunk",
  chapter: "/ebooks/1.2/anatomy/chapter-03",
  masks: [
    { id: "m1", x: 10, y: 10, w: 100, h: 20, label: "Caput" },
    { id: "m2", x: 900, y: 760, w: 90, h: 20, label: "Collum" },
  ],
};

describe("occlusionCards", () => {
  it("makes one card per mask with a stable id and the region as its tag", () => {
    const cards = occlusionCards([note]);
    expect(cards.map((c) => c.id)).toEqual(["c1-p1:m1", "c1-p1:m2"]);
    expect(cards[0].tags).toEqual(["trunk"]);
    expect(cards[1].mask.label).toBe("Collum");
  });
});

describe("zoomBox", () => {
  it("frames the mask and stays inside the image", () => {
    for (const mask of note.masks) {
      const b = zoomBox(note, mask);
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w).toBeLessThanOrEqual(note.width + 1e-9);
      expect(b.y + b.h).toBeLessThanOrEqual(note.height + 1e-9);
      expect(mask.x).toBeGreaterThanOrEqual(b.x);
      expect(mask.x + mask.w).toBeLessThanOrEqual(b.x + b.w + 1e-9);
      expect(mask.y + mask.h).toBeLessThanOrEqual(b.y + b.h + 1e-9);
    }
  });
});
