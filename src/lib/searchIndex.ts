import {
  ebookChapters,
  ebookMeta,
  ebookSubjects,
  examPackagesByBlock,
  flashcardDecks,
  flashcardSubjects,
  keyOf,
  modulesByBlockSubject,
  quizBanks,
  quizQuestionsInBlock,
  quizSubjects,
  summaries,
  summarySubjects,
} from "./content";
import { studyBlocks } from "./blocks";
import { markdownToPlainText, splitMarkdownSections, truncate } from "./textExtract";

const EXCERPT_LENGTH = 200;

export interface SearchDoc {
  type: "page" | "flashcard" | "quiz" | "exam" | "ebook" | "summary" | "module";
  id: string;
  title: string;
  detail: string;
  to: string;
  subjectId?: string;
  /** Extra matchable text not shown in results (flashcard tags, quiz option text) — broadens recall. */
  keywords?: string;
}

const staticPages: SearchDoc[] = [
  { type: "page", id: "home", title: "Home", detail: "Tip of the day, quick links", to: "/" },
  { type: "page", id: "flashcards", title: "Flashcards", detail: "Spaced-repetition review", to: "/flashcards" },
  { type: "page", id: "quizzes", title: "Quizzes", detail: "Multiple-choice question banks", to: "/quizzes" },
  { type: "page", id: "exam", title: "Exam", detail: "Timed block exams, scored at the end", to: "/exam" },
  { type: "page", id: "modules", title: "Modules", detail: "Original lecture slide PDFs", to: "/modules" },
  { type: "page", id: "ebooks", title: "Ebooks", detail: "Chapter readers", to: "/ebooks" },
  { type: "page", id: "summaries", title: "Summaries", detail: "Written subject summaries", to: "/summaries" },
  { type: "page", id: "search", title: "Search", detail: "Search everything", to: "/search" },
  { type: "page", id: "progress", title: "Progress", detail: "Streaks, export & import", to: "/progress" },
];

function subjectDocs(): SearchDoc[] {
  return [
    ...flashcardSubjects.map((s) => ({
      type: "flashcard" as const,
      id: `fs-${keyOf(s)}`,
      title: `${s.label} flashcards`,
      detail: `Block ${s.blockId} deck`,
      to: `/flashcards/${s.blockId}/${s.id}`,
    })),
    ...quizSubjects.map((s) => ({
      type: "quiz" as const,
      id: `qs-${keyOf(s)}`,
      title: `${s.label} quiz`,
      detail: `Block ${s.blockId} question bank`,
      to: `/quizzes/${s.blockId}/${s.id}`,
    })),
    ...studyBlocks
      .filter(
        (b) =>
          (examPackagesByBlock[b.id]?.length ?? 0) > 0 ||
          quizQuestionsInBlock(b.id).length > 0,
      )
      .map((b) => ({
        type: "exam" as const,
        id: `xb-${b.id}`,
        title: `${b.label} exam`,
        detail: "Timed block exam",
        to: `/exam/${b.id}`,
      })),
    ...Object.keys(modulesByBlockSubject).map((key) => {
      const [blockId, subjectId] = key.split("/");
      const label = subjectId.charAt(0).toUpperCase() + subjectId.slice(1);
      const count = modulesByBlockSubject[key].length;
      return {
        type: "module" as const,
        id: `md-${key}`,
        title: `${label} modules`,
        detail: `Block ${blockId} · ${count} PDF${count === 1 ? "" : "s"}`,
        to: `/modules/${blockId}/${subjectId}`,
      };
    }),
    ...ebookSubjects.map((s) => ({
      type: "ebook" as const,
      id: `es-${keyOf(s)}`,
      title: s.label,
      detail: `Block ${s.blockId} ebook`,
      to: `/ebooks/${s.blockId}/${s.id}`,
    })),
    ...summarySubjects.map((s) => ({
      type: "summary" as const,
      id: `ss-${keyOf(s)}`,
      title: `${s.label} summary`,
      detail: `Block ${s.blockId} summary`,
      to: `/summaries/${s.blockId}/${s.id}`,
    })),
  ];
}

/** The bare subject id from a "{blockId}/{subjectId}" key, used for the subject filter chips. */
function subjectOf(key: string): string {
  return key.split("/")[1] ?? key;
}

function contentDocs(): SearchDoc[] {
  const flashcardDocs = Object.entries(flashcardDecks).flatMap(([key, cards]) =>
    cards.map((card) => ({
      type: "flashcard" as const,
      id: card.id,
      title: card.front,
      detail: card.back,
      to: `/flashcards/${key}`,
      subjectId: subjectOf(key),
      keywords: card.tags.join(" "),
    })),
  );
  const quizDocs = Object.entries(quizBanks).flatMap(([key, bank]) =>
    bank.map((q) => ({
      type: "quiz" as const,
      id: q.id,
      title: q.question,
      detail: q.explanation,
      to: `/quizzes/${key}`,
      subjectId: subjectOf(key),
      keywords: q.options.join(" "),
    })),
  );
  const summaryDocs = Object.entries(summaries).flatMap(([key, markdown]) => {
    const subjectId = subjectOf(key);
    const label = summarySubjects.find((s) => keyOf(s) === key)?.label ?? subjectId;
    const to = `/summaries/${key}`;
    const sections = splitMarkdownSections(markdown);

    if (sections.length === 0) {
      return [
        {
          type: "summary" as const,
          id: `sum-${key}`,
          title: `${label} summary`,
          detail: truncate(markdownToPlainText(markdown), EXCERPT_LENGTH),
          to,
          subjectId,
        },
      ];
    }

    return sections
      .map((section, i) => ({
        type: "summary" as const,
        id: `sum-${key}-${i}`,
        title: `${label}: ${section.heading}`,
        detail: truncate(markdownToPlainText(section.body), EXCERPT_LENGTH),
        keywords: markdownToPlainText(section.body),
        to,
        subjectId,
      }))
      .filter((doc) => doc.detail.length > 0);
  });
  const ebookDocs = Object.entries(ebookChapters).flatMap(([key, markdown]) => {
    const [blockId, subjectId, chapterId] = key.split("/");
    const meta = ebookMeta[`${blockId}/${subjectId}`];
    const chapterTitle = meta?.chapters.find((c) => c.id === chapterId)?.title ?? chapterId;
    const to = `/ebooks/${blockId}/${subjectId}/${chapterId}`;
    const sections = splitMarkdownSections(markdown);

    if (sections.length === 0) {
      return [
        {
          type: "ebook" as const,
          id: `eb-${key}`,
          title: chapterTitle,
          detail: truncate(markdownToPlainText(markdown), EXCERPT_LENGTH),
          to,
          subjectId,
        },
      ];
    }

    return sections
      .map((section, i) => ({
        type: "ebook" as const,
        id: `eb-${key}-${i}`,
        title: `${chapterTitle}: ${section.heading}`,
        detail: truncate(markdownToPlainText(section.body), EXCERPT_LENGTH),
        keywords: markdownToPlainText(section.body),
        to,
        subjectId,
      }))
      .filter((doc) => doc.detail.length > 0);
  });
  return [...flashcardDocs, ...quizDocs, ...summaryDocs, ...ebookDocs];
}

/** Full-content index (flashcards, quiz questions, summary sections, ebook sections), used by the Search page. */
export function buildContentDocs(): SearchDoc[] {
  return contentDocs();
}

/** Lighter index (pages + subjects only), used by the command palette for fast navigation. */
export function buildNavigationDocs(): SearchDoc[] {
  return [...staticPages, ...subjectDocs()];
}
