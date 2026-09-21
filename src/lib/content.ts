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
// A dedicated, curated question bank for a study block's exam (e.g. sourced from a real past
// exam), keyed by block id. Falls back to pooling that block's regular quiz banks when absent.
const examBankModules = import.meta.glob<QuizQuestion[]>(
  "../../content/exams/*/bank.json",
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
// Self-contained interactive HTML quizzes (their own UI/scoring, e.g. an image-ID game) dropped
// into a subject's folder are exposed as a URL and embedded via iframe — no bank.json needed.
const quizGameModules = import.meta.glob<string>("../../content/quizzes/*/*.html", {
  eager: true,
  import: "default",
  query: "?url",
});
// Raw lecture-slide PDFs, organized by block then subject — drop a file at
// content/modules/block/{blockId}/{subjectId}/anything.pdf and it shows up with no code changes.
const moduleModules = import.meta.glob<string>("../../content/modules/block/*/*/*.pdf", {
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

function moduleKey(path: string): string {
  const match = path.match(/modules\/block\/([^/]+)\/([^/]+)\/[^/]+\.pdf$/);
  return match ? `${match[1]}/${match[2]}` : path;
}

// Slide decks get exported to PDF with ordinal prefixes and a stray ".pptx" left in the
// filename (e.g. "7_Histologi jaringan epithel-Agustus 2025.pptx.pdf") — clean that up for display.
function moduleName(path: string): string {
  const match = path.match(/([^/]+)\.pdf$/);
  if (!match) return "Module";
  return match[1]
    .replace(/\.pptx$/i, "")
    .replace(/^\d+[._]\s*/, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function quizGameSubject(path: string): string {
  const match = path.match(/quizzes\/([^/]+)\/[^/]+\.html$/);
  return match ? match[1] : path;
}

function htmlName(path: string): string {
  const match = path.match(/([^/]+)\.html$/);
  return match ? match[1].replace(/[-_]/g, " ") : "Quiz";
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

/** Dedicated exam question banks, keyed by block id. */
export const examBanks: Record<string, QuizQuestion[]> = Object.fromEntries(
  Object.entries(examBankModules).map(([path, questions]) => [
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

export interface QuizGame {
  name: string;
  url: string;
}

export const quizGames: Record<string, QuizGame[]> = {};
for (const [path, url] of Object.entries(quizGameModules)) {
  const subjectId = quizGameSubject(path);
  (quizGames[subjectId] ??= []).push({ name: htmlName(path), url });
}
for (const list of Object.values(quizGames)) {
  list.sort((a, b) => a.name.localeCompare(b.name));
}

export const quizSubjects: Subject[] = Array.from(
  new Set([...Object.keys(quizBanks), ...Object.keys(quizGames)]),
)
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

export interface ModulePdf {
  name: string;
  url: string;
}

/** Lecture-slide PDFs, keyed by "{blockId}/{subjectId}". */
export const modulesByBlockSubject: Record<string, ModulePdf[]> = {};
for (const [path, url] of Object.entries(moduleModules)) {
  const key = moduleKey(path);
  (modulesByBlockSubject[key] ??= []).push({ name: moduleName(path), url });
}
for (const list of Object.values(modulesByBlockSubject)) {
  list.sort((a, b) => a.name.localeCompare(b.name));
}

/** Subject ids that have at least one module PDF somewhere, across all blocks. */
export const moduleSubjectIds: Set<string> = new Set(
  Object.keys(modulesByBlockSubject).map((key) => key.split("/")[1]),
);
