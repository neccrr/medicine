import {
  ebookChapters,
  ebookMeta,
  ebookSubjects,
  examPackagesByBlock,
  flashcardDecks,
  flashcardSubjects,
  modulesByBlockSubject,
  quizBanks,
  quizSubjects,
  summaries,
  summarySubjects,
} from "./content";
import { blockIdForSubject, studyBlocks } from "./blocks";
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
      id: `fs-${s.id}`,
      title: `${s.label} flashcards`,
      detail: "Subject deck",
      to: `/flashcards/${blockIdForSubject(s.id)}/${s.id}`,
    })),
    ...quizSubjects.map((s) => ({
      type: "quiz" as const,
      id: `qs-${s.id}`,
      title: `${s.label} quiz`,
      detail: "Question bank",
      to: `/quizzes/${blockIdForSubject(s.id)}/${s.id}`,
    })),
    ...studyBlocks
      .filter(
        (b) =>
          (examPackagesByBlock[b.id]?.length ?? 0) > 0 ||
          b.subjectIds.some((id) => (quizBanks[id]?.length ?? 0) > 0),
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
      const label = flashcardSubjects.find((s) => s.id === subjectId)?.label ?? subjectId;
      const count = modulesByBlockSubject[key].length;
      return {
        type: "module" as const,
        id: `md-${key}`,
        title: `${label} modules`,
        detail: `${count} lecture${count === 1 ? "" : "s"}`,
        to: `/modules/${blockId}/${subjectId}`,
      };
    }),
    ...ebookSubjects.map((s) => ({
      type: "ebook" as const,
      id: `es-${s.id}`,
      title: s.label,
      detail: "Ebook",
      to: `/ebooks/${blockIdForSubject(s.id)}/${s.id}`,
    })),
    ...summarySubjects.map((s) => ({
      type: "summary" as const,
      id: `ss-${s.id}`,
      title: `${s.label} summary`,
      detail: "Written summary",
      to: `/summaries/${blockIdForSubject(s.id)}/${s.id}`,
    })),
  ];
}

function contentDocs(): SearchDoc[] {
  const flashcardDocs = Object.entries(flashcardDecks).flatMap(([subjectId, cards]) =>
    cards.map((card) => ({
      type: "flashcard" as const,
      id: card.id,
      title: card.front,
      detail: card.back,
      to: `/flashcards/${blockIdForSubject(subjectId)}/${subjectId}`,
      subjectId,
      keywords: card.tags.join(" "),
    })),
  );
  const quizDocs = Object.entries(quizBanks).flatMap(([subjectId, bank]) =>
    bank.map((q) => ({
      type: "quiz" as const,
      id: q.id,
      title: q.question,
      detail: q.explanation,
      to: `/quizzes/${blockIdForSubject(subjectId)}/${subjectId}`,
      subjectId,
      keywords: q.options.join(" "),
    })),
  );
  const summaryDocs = Object.entries(summaries).flatMap(([subjectId, markdown]) => {
    const label = summarySubjects.find((s) => s.id === subjectId)?.label ?? subjectId;
    const to = `/summaries/${blockIdForSubject(subjectId)}/${subjectId}`;
    const sections = splitMarkdownSections(markdown);

    if (sections.length === 0) {
      return [
        {
          type: "summary" as const,
          id: `sum-${subjectId}`,
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
        id: `sum-${subjectId}-${i}`,
        title: `${label}: ${section.heading}`,
        detail: truncate(markdownToPlainText(section.body), EXCERPT_LENGTH),
        keywords: markdownToPlainText(section.body),
        to,
        subjectId,
      }))
      .filter((doc) => doc.detail.length > 0);
  });
  const ebookDocs = Object.entries(ebookChapters).flatMap(([key, markdown]) => {
    const [subjectId, chapterId] = key.split("/");
    const meta = ebookMeta[subjectId];
    const chapterTitle = meta?.chapters.find((c) => c.id === chapterId)?.title ?? chapterId;
    const to = `/ebooks/${blockIdForSubject(subjectId)}/${subjectId}/${chapterId}`;
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
