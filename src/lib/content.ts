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
// PDFs dropped into a subject's folder are copied to the build output and exposed as a URL —
// drop a file at content/ebooks/{subject}/anything.pdf and it shows up with no code changes.
const ebookPdfModules = import.meta.glob<string>("../../content/ebooks/*/*.pdf", {
  eager: true,
  import: "default",
  query: "?url",
});

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

function ebookPdfSubject(path: string): string {
  const match = path.match(/ebooks\/([^/]+)\/[^/]+\.pdf$/);
  return match ? match[1] : path;
}

function pdfName(path: string): string {
  const match = path.match(/([^/]+)\.pdf$/);
  return match ? match[1].replace(/[-_]/g, " ") : "PDF";
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

const ebookMetaFromFiles: Record<string, EbookMeta> = Object.fromEntries(
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

export interface EbookPdf {
  name: string;
  url: string;
}

export const ebookPdfs: Record<string, EbookPdf[]> = {};
for (const [path, url] of Object.entries(ebookPdfModules)) {
  const subjectId = ebookPdfSubject(path);
  (ebookPdfs[subjectId] ??= []).push({ name: pdfName(path), url });
}
for (const list of Object.values(ebookPdfs)) {
  list.sort((a, b) => a.name.localeCompare(b.name));
}

// A subject folder that only contains PDFs (no meta.json/chapters) still gets a book entry,
// synthesized from the folder name — dropping a PDF in is enough on its own.
export const ebookMeta: Record<string, EbookMeta> = { ...ebookMetaFromFiles };
for (const subjectId of Object.keys(ebookPdfs)) {
  if (!ebookMeta[subjectId]) {
    ebookMeta[subjectId] = {
      title: labelize(subjectId),
      description: "PDF reference",
      chapters: [],
    };
  }
}

export const ebookSubjects: Subject[] = Object.keys(ebookMeta)
  .sort()
  .map((id) => ({ id, label: ebookMeta[id].title }));
