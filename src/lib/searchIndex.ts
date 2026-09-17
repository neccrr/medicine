import {
  ebookSubjects,
  flashcardDecks,
  flashcardSubjects,
  quizBanks,
  quizSubjects,
  summarySubjects,
} from "./content";

export interface SearchDoc {
  type: "page" | "flashcard" | "quiz" | "ebook" | "summary";
  id: string;
  title: string;
  detail: string;
  to: string;
}

const staticPages: SearchDoc[] = [
  { type: "page", id: "home", title: "Home", detail: "Tip of the day, quick links", to: "/" },
  { type: "page", id: "flashcards", title: "Flashcards", detail: "Spaced-repetition review", to: "/flashcards" },
  { type: "page", id: "quizzes", title: "Quizzes", detail: "Multiple-choice question banks", to: "/quizzes" },
  { type: "page", id: "ebooks", title: "Ebooks", detail: "Chapter readers", to: "/ebooks" },
  { type: "page", id: "summaries", title: "Summaries", detail: "Written subject summaries", to: "/summaries" },
  { type: "page", id: "search", title: "Search", detail: "Search flashcards & quizzes", to: "/search" },
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
    })),
  );
  const quizDocs = Object.entries(quizBanks).flatMap(([subjectId, bank]) =>
    bank.map((q) => ({
      type: "quiz" as const,
      id: q.id,
      title: q.question,
      detail: q.explanation,
      to: `/quizzes/${subjectId}`,
    })),
  );
  return [...flashcardDocs, ...quizDocs];
}

/** Full-content index (flashcards + quiz questions), used by the Search page. */
export function buildContentDocs(): SearchDoc[] {
  return contentDocs();
}

/** Lighter index (pages + subjects only), used by the command palette for fast navigation. */
export function buildNavigationDocs(): SearchDoc[] {
  return [...staticPages, ...subjectDocs()];
}
