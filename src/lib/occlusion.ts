import type { Flashcard, OcclusionMask, OcclusionNote } from "../types/content";

/** One card per hidden label: "{noteId}:{maskId}". */
export function occlusionCardId(note: OcclusionNote, mask: OcclusionMask): string {
  return `${note.id}:${mask.id}`;
}

export interface OcclusionCard extends Flashcard {
  note: OcclusionNote;
  mask: OcclusionMask;
}

/**
 * The deck's cards, figure by figure, so consecutive cards usually share an image. Each is also a
 * Flashcard (front = figure and label, tags = region) so the spaced-repetition hook, sync and
 * "hardest cards" work on it unchanged.
 */
export function occlusionCards(notes: readonly OcclusionNote[]): OcclusionCard[] {
  return notes.flatMap((note) =>
    note.masks.map((mask) => ({
      id: occlusionCardId(note, mask),
      front: `${note.title}: ${mask.label}`,
      back: mask.label,
      tags: [note.region],
      note,
      mask,
    })),
  );
}

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A window around one mask, `scale` times the image's smaller side, kept inside the image, so a
 * small label on a big atlas figure is readable on a phone. The whole figure when it's smaller.
 */
export function zoomBox(note: Pick<OcclusionNote, "width" | "height">, mask: OcclusionMask, scale = 0.6): ViewBox {
  const side = Math.min(note.width, note.height) * scale;
  const w = Math.min(note.width, Math.max(side, mask.w * 2.2));
  const h = Math.min(note.height, Math.max(side * 0.75, mask.h * 4));
  const cx = mask.x + mask.w / 2;
  const cy = mask.y + mask.h / 2;
  const x = Math.min(Math.max(0, cx - w / 2), note.width - w);
  const y = Math.min(Math.max(0, cy - h / 2), note.height - h);
  return { x, y, w, h };
}

/** Human names for the region tags. */
export const REGION_LABELS: Record<string, string> = {
  basic: "Basic anatomy",
  embryology: "Embryology",
  trunk: "Trunk",
  cranium: "Cranium",
  "face-neck": "Face & neck",
  "upper-limb": "Upper limb",
  "lower-limb": "Lower limb",
};
