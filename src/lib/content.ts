import type { EbookMeta, Flashcard, QuizQuestion, Subject } from "../types/content";

// Vite bundles all matching JSON/MD files at build time — fully static, no server round-trip.
const flashcardModules = import.meta.glob<Flashcard[]>(
  "../../content/flashcards/*/deck.json",
  { eager: true, import: "default" },
);
const quizModules = import.meta.glob<QuizQuestion[]>(
  "../../content/quizzes/*/bank.json",
  { eager: true, import: "default" },
);
const summaryModules = import.meta.glob<string>(
  "../../content/summaries/*.md",
  { eager: true, import: "default", query: "?raw" },
);
const tipsModule = import.meta.glob<string[]>("../../content/tips/tips.json", {
  eager: true,
  import: "default",
});
const ebookMetaModules = import.meta.glob<EbookMeta>(
  "../../content/ebooks/*/meta.json",
  { eager: true, import: "default" },
);
const ebookChapterModules = import.meta.glob<string>(
  "../../content/ebooks/*/chapter-*.md",
  { eager: true, import: "default", query: "?raw" },
);

function subjectFromPath(path: string): string {
  const match = path.match(/\/([^/]+)\/(deck|bank|meta)\.json$/);
  return match ? match[1] : path;
}

function subjectFromMdPath(path: string): string {
  const match = path.match(/\/([^/]+)\.md$/);
  return match ? match[1] : path;
}

function ebookChapterKey(path: string): string {
  const match = path.match(/ebooks\/([^/]+)\/([^/]+)\.md$/);
  return match ? `${match[1]}/${match[2]}` : path;
}

function labelize(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export const flashcardDecks: Record<string, Flashcard[]> = Object.fromEntries(
  Object.entries(flashcardModules).map(([path, cards]) => [
    subjectFromPath(path),
    cards,
  ]),
);

export const quizBanks: Record<string, QuizQuestion[]> = Object.fromEntries(
  Object.entries(quizModules).map(([path, questions]) => [
    subjectFromPath(path),
    questions,
  ]),
);

export const summaries: Record<string, string> = Object.fromEntries(
  Object.entries(summaryModules).map(([path, markdown]) => [
    subjectFromMdPath(path),
    markdown,
  ]),
);

export const tips: string[] = Object.values(tipsModule)[0] ?? [];

export const flashcardSubjects: Subject[] = Object.keys(flashcardDecks)
  .sort()
  .map((id) => ({ id, label: labelize(id) }));

export const quizSubjects: Subject[] = Object.keys(quizBanks)
  .sort()
  .map((id) => ({ id, label: labelize(id) }));

export const summarySubjects: Subject[] = Object.keys(summaries)
  .sort()
  .map((id) => ({ id, label: labelize(id) }));

export const ebookMeta: Record<string, EbookMeta> = Object.fromEntries(
  Object.entries(ebookMetaModules).map(([path, meta]) => [
    subjectFromPath(path),
    meta,
  ]),
);

export const ebookChapters: Record<string, string> = Object.fromEntries(
  Object.entries(ebookChapterModules).map(([path, markdown]) => [
    ebookChapterKey(path),
    markdown,
  ]),
);

export const ebookSubjects: Subject[] = Object.keys(ebookMeta)
  .sort()
  .map((id) => ({ id, label: ebookMeta[id].title }));
