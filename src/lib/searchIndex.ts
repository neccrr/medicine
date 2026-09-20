import {
  ebookChapters,
  ebookMeta,
  ebookSubjects,
  flashcardDecks,
  flashcardSubjects,
  quizBanks,
  quizSubjects,
  summaries,
  summarySubjects,
} from "./content";
import { markdownToPlainText, splitMarkdownSections, truncate } from "./textExtract";

const EXCERPT_LENGTH = 200;

export interface SearchDoc {
  type: "page" | "flashcard" | "quiz" | "ebook" | "summary";
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
      to: `/flashcards/${s.id}`,
    })),
    ...quizSubjects.map((s) => ({
      type: "quiz" as const,
      id: `qs-${s.id}`,
      title: `${s.label} quiz`,
      detail: "Question bank",
      to: `/quizzes/${s.id}`,
    })),
    ...ebookSubjects.map((s) => ({
      type: "ebook" as const,
      id: `es-${s.id}`,
      title: s.label,
      detail: "Ebook",
      to: `/ebooks/${s.id}`,
    })),
    ...summarySubjects.map((s) => ({
      type: "summary" as const,
      id: `ss-${s.id}`,
      title: `${s.label} summary`,
      detail: "Written summary",
      to: `/summaries/${s.id}`,
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
      to: `/flashcards/${subjectId}`,
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
      to: `/quizzes/${subjectId}`,
      subjectId,
      keywords: q.options.join(" "),
    })),
  );
  const summaryDocs = Object.entries(summaries).flatMap(([subjectId, markdown]) => {
    const label = summarySubjects.find((s) => s.id === subjectId)?.label ?? subjectId;
    const to = `/summaries/${subjectId}`;
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
        to,
        subjectId,
      }))
      .filter((doc) => doc.detail.length > 0);
  });
  const ebookDocs = Object.entries(ebookChapters).flatMap(([key, markdown]) => {
    const [subjectId, chapterId] = key.split("/");
    const meta = ebookMeta[subjectId];
    const chapterTitle = meta?.chapters.find((c) => c.id === chapterId)?.title ?? chapterId;
    const to = `/ebooks/${subjectId}/${chapterId}`;
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
