export interface StudyBlock {
  id: string;
  label: string;
  subjectIds: string[];
}

export interface UpcomingSubject {
  id: string;
  label: string;
  blockId: string;
}

/**
 * Curriculum grouping above "subject" — which subjects belong to which study block.
 * Not derived from content folders (unlike subjects themselves): update this list by hand
 * when a subject moves between blocks or a new block starts.
 */
export const studyBlocks: StudyBlock[] = [
  {
    id: "1.1",
    label: "Block 1.1: Biology Block: Cell and Hematology",
    subjectIds: ["histology", "biochem", "physiology"],
  },
  { id: "1.2", label: "Block 1.2: Integument and Musculoskeletal System", subjectIds: [] },
  { id: "1.3", label: "Block 1.3: Digestive System and Metabolism", subjectIds: [] },
];

/** Subjects announced for a block before any content has been uploaded for them. */
export const upcomingSubjects: UpcomingSubject[] = [
  { id: "anatomy", label: "Anatomy", blockId: "1.2" },
  { id: "gi-metabolism", label: "Digestive System & Metabolism", blockId: "1.3" },
];

export function blockById(blockId: string): StudyBlock | undefined {
  return studyBlocks.find((b) => b.id === blockId);
}

/** Which study block a subject belongs to — used to build block-sectioned routes (/flashcards/:blockId/:subjectId, etc). */
export function blockIdForSubject(subjectId: string): string | undefined {
  return studyBlocks.find((b) => b.subjectIds.includes(subjectId))?.id;
}

export interface BlockGroup<T> {
  block: StudyBlock;
  subjects: T[];
  upcoming: UpcomingSubject[];
}

/** Buckets a flat subject list into its study blocks, in block order, dropping empty blocks. */
export function groupByBlock<T extends { id: string }>(subjects: T[]): BlockGroup<T>[] {
  return studyBlocks
    .map((block) => ({
      block,
      subjects: subjects.filter((s) => block.subjectIds.includes(s.id)),
      upcoming: upcomingSubjects.filter((u) => u.blockId === block.id),
    }))
    .filter((g) => g.subjects.length > 0 || g.upcoming.length > 0);
}
