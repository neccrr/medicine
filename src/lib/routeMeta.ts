// Title, description and indexability for every route, used by the app (usePageMeta keeps the
// document head in step while navigating) and by the build's prerender step (a static HTML page
// per route, the sitemap). One place, so the two always agree.

import { blockById, studyBlocks } from "./blocks";
import {
  ebookMeta,
  ebookSubjects,
  examPackagesByBlock,
  flashcardDecks,
  flashcardSubjects,
  keyOf,
  modulesByBlockSubject,
  moduleSubjects,
  quizBanks,
  quizQuestionsInBlock,
  quizSubjects,
  subjectKey,
  summaries,
  summarySubjects,
} from "./content";
import { HOME_DESCRIPTION, HOME_TITLE, SITE_NAME } from "./site";
import { markdownToPlainText, truncate } from "./textExtract";
import type { Subject } from "../types/content";

export interface PageMeta {
  title: string;
  description: string;
  /** False for personal pages (progress, account) and unknown routes: kept out of search. */
  indexable: boolean;
}

export interface Crumb {
  name: string;
  path: string;
}

const DESCRIPTION_LENGTH = 158;

/** "Block 1.2" from "Block 1.2: Integument and Musculoskeletal System". */
function blockShort(blockId: string): string {
  return `Block ${blockId}`;
}

function blockLabel(blockId: string): string {
  return blockById(blockId)?.label ?? blockShort(blockId);
}

const titled = (title: string) => `${title} · ${SITE_NAME}`;
const describe = (text: string) => truncate(text.replace(/\s+/g, " ").trim(), DESCRIPTION_LENGTH);

function findSubject(list: Subject[], blockId: string, subjectId: string): Subject | undefined {
  return list.find((s) => s.blockId === blockId && s.id === subjectId);
}

const SECTIONS: Record<string, { name: string; meta: PageMeta }> = {
  flashcards: {
    name: "Flashcards",
    meta: {
      title: titled("Flashcards for Medical Students"),
      description: describe(
        `Free spaced-repetition flashcard decks for ${flashcardSubjects.map((s) => s.label).join(", ")}, organised by study block. Works offline.`,
      ),
      indexable: true,
    },
  },
  quizzes: {
    name: "Quizzes",
    meta: {
      title: titled("Medical School Quizzes"),
      description: describe(
        `Free multiple-choice question banks with explanations for ${quizSubjects.map((s) => s.label).join(", ")}, organised by study block.`,
      ),
      indexable: true,
    },
  },
  exam: {
    name: "Exam",
    meta: {
      title: titled("Timed Block Practice Exams"),
      description: describe("Timed practice exams for each study block, built from past papers and scored at the end, with every answer explained."),
      indexable: true,
    },
  },
  modules: {
    name: "Modules",
    meta: {
      title: titled("Lecture and Practicum Modules"),
      description: describe("The lecture and practicum slides for each subject and study block, in one place."),
      indexable: true,
    },
  },
  ebooks: {
    name: "Ebooks",
    meta: {
      title: titled("Medical Study Ebooks"),
      description: describe(
        `Free chaptered study ebooks: ${ebookSubjects.map((s) => ebookMeta[keyOf(s)]?.title ?? s.label).join(", ")}.`,
      ),
      indexable: true,
    },
  },
  summaries: {
    name: "Summaries",
    meta: {
      title: titled("Subject Summaries"),
      description: describe(`Concise written summaries for ${summarySubjects.map((s) => s.label).join(", ")}, organised by study block.`),
      indexable: true,
    },
  },
  search: { name: "Search", meta: { title: titled("Search"), description: HOME_DESCRIPTION, indexable: false } },
  progress: { name: "Progress", meta: { title: titled("Your Progress"), description: HOME_DESCRIPTION, indexable: false } },
  leaderboard: { name: "Leaderboard", meta: { title: titled("Leaderboard"), description: HOME_DESCRIPTION, indexable: false } },
  account: { name: "Account", meta: { title: titled("Account"), description: HOME_DESCRIPTION, indexable: false } },
};

/** Whether a block has an exam: its own past-paper packages, or else its quiz questions. */
export function blockHasExam(blockId: string): boolean {
  return (examPackagesByBlock[blockId]?.length ?? 0) > 0 || quizQuestionsInBlock(blockId).length > 0;
}

const NOT_FOUND: PageMeta = { title: HOME_TITLE, description: HOME_DESCRIPTION, indexable: false };

/** Metadata for a pathname (no query string). */
export function pageMeta(pathname: string): PageMeta {
  const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (parts.length === 0) return { title: HOME_TITLE, description: HOME_DESCRIPTION, indexable: true };
  const [section, blockId, subjectId, chapterId] = parts;
  const sectionInfo = SECTIONS[section];
  if (!sectionInfo) return NOT_FOUND;
  if (parts.length === 1) return sectionInfo.meta;

  if (section === "exam") {
    const packages = examPackagesByBlock[blockId] ?? [];
    if (!blockHasExam(blockId) || parts.length > 3) return NOT_FOUND;
    if (parts.length === 2) {
      return {
        title: titled(`${blockShort(blockId)} Practice Exam`),
        description: describe(`Timed practice exam for ${blockLabel(blockId)}: up to 100 questions, scored at the end with explanations.`),
        indexable: true,
      };
    }
    const pkg = packages.find((p) => p.id === subjectId);
    if (!pkg) return NOT_FOUND;
    return {
      title: titled(`${pkg.name} (${blockShort(blockId)})`),
      description: describe(`${pkg.name}: a timed practice exam for ${blockLabel(blockId)}, scored at the end with explanations.`),
      indexable: true,
    };
  }

  if (parts.length < 3) return NOT_FOUND;
  const key = subjectKey(blockId, subjectId);
  const where = `${blockLabel(blockId)}`;

  if (section === "flashcards" && parts.length === 3) {
    const subject = findSubject(flashcardSubjects, blockId, subjectId);
    if (!subject) return NOT_FOUND;
    const n = flashcardDecks[key]?.length ?? 0;
    return {
      title: titled(`${subject.label} Flashcards (${blockShort(blockId)})`),
      description: describe(`${n} free spaced-repetition flashcards for ${subject.label}, ${where}. Review what's due each day; works offline.`),
      indexable: true,
    };
  }
  if (section === "quizzes" && parts.length === 3) {
    const subject = findSubject(quizSubjects, blockId, subjectId);
    if (!subject) return NOT_FOUND;
    const n = quizBanks[key]?.length ?? 0;
    return {
      title: titled(`${subject.label} Quiz (${blockShort(blockId)})`),
      description: describe(`${n} multiple-choice questions with explanations for ${subject.label}, ${where}. Free, works offline.`),
      indexable: true,
    };
  }
  if (section === "modules" && parts.length === 3) {
    const subject = findSubject(moduleSubjects, blockId, subjectId);
    if (!subject) return NOT_FOUND;
    const n = modulesByBlockSubject[key]?.length ?? 0;
    return {
      title: titled(`${subject.label} Modules (${blockShort(blockId)})`),
      description: describe(`${n} lecture and practicum modules for ${subject.label}, ${where}.`),
      indexable: true,
    };
  }
  if (section === "summaries" && parts.length === 3) {
    const subject = findSubject(summarySubjects, blockId, subjectId);
    const markdown = summaries[key];
    if (!subject || markdown === undefined) return NOT_FOUND;
    return {
      title: titled(`${subject.label} Summary (${blockShort(blockId)})`),
      description: describe(markdownToPlainText(markdown)),
      indexable: true,
    };
  }
  if (section === "ebooks") {
    const book = ebookMeta[key];
    if (!book || parts.length > 4) return NOT_FOUND;
    if (parts.length === 3) {
      return { title: titled(book.title), description: describe(book.description), indexable: true };
    }
    const index = book.chapters.findIndex((c) => c.id === chapterId);
    if (index === -1) return NOT_FOUND;
    const chapter = book.chapters[index];
    return {
      title: titled(`${chapter.title} · ${book.title}`),
      description: describe(`Chapter ${index + 1} of ${book.title}: ${chapter.title}. ${book.description}`),
      indexable: true,
    };
  }
  return NOT_FOUND;
}

/** The trail from Home to this page, for breadcrumb structured data. */
export function breadcrumbs(pathname: string): Crumb[] {
  const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const crumbs: Crumb[] = [{ name: "Home", path: "/" }];
  const [section, blockId, subjectId, chapterId] = parts;
  const sectionInfo = section ? SECTIONS[section] : undefined;
  if (!sectionInfo) return crumbs;
  crumbs.push({ name: sectionInfo.name, path: `/${section}` });
  if (section === "exam" && blockId) {
    crumbs.push({ name: `${blockShort(blockId)} exam`, path: `/exam/${blockId}` });
  }
  if (section !== "exam" && blockId && subjectId) {
    const bookTitle = section === "ebooks" ? ebookMeta[subjectKey(blockId, subjectId)]?.title : undefined;
    crumbs.push({ name: bookTitle ?? pageMeta(`/${section}/${blockId}/${subjectId}`).title.replace(` · ${SITE_NAME}`, ""), path: `/${section}/${blockId}/${subjectId}` });
    if (chapterId) {
      const chapter = ebookMeta[subjectKey(blockId, subjectId)]?.chapters.find((c) => c.id === chapterId);
      if (chapter) crumbs.push({ name: chapter.title, path: `/${section}/${blockId}/${subjectId}/${chapterId}` });
    }
  }
  if (section === "exam" && blockId && subjectId) {
    const pkg = examPackagesByBlock[blockId]?.find((p) => p.id === subjectId);
    if (pkg) crumbs.push({ name: pkg.name, path: `/exam/${blockId}/${subjectId}` });
  }
  return crumbs;
}

/** Every page that should be in search results, in a stable order. */
export function indexablePaths(): string[] {
  const paths = ["/", "/flashcards", "/quizzes", "/exam", "/modules", "/ebooks", "/summaries"];
  for (const s of flashcardSubjects) paths.push(`/flashcards/${keyOf(s)}`);
  for (const s of quizSubjects) paths.push(`/quizzes/${keyOf(s)}`);
  for (const block of studyBlocks) {
    if (!blockHasExam(block.id)) continue;
    const packages = examPackagesByBlock[block.id] ?? [];
    paths.push(`/exam/${block.id}`);
    if (packages.length > 1) for (const p of packages) paths.push(`/exam/${block.id}/${p.id}`);
  }
  for (const s of moduleSubjects) paths.push(`/modules/${keyOf(s)}`);
  for (const s of ebookSubjects) {
    paths.push(`/ebooks/${keyOf(s)}`);
    for (const c of ebookMeta[keyOf(s)]?.chapters ?? []) paths.push(`/ebooks/${keyOf(s)}/${c.id}`);
  }
  for (const s of summarySubjects) paths.push(`/summaries/${keyOf(s)}`);
  return paths.filter((p) => pageMeta(p).indexable);
}

/** App pages that are rendered for everyone but kept out of search. */
export const PRIVATE_PATHS = ["/search", "/progress", "/leaderboard", "/account"];
