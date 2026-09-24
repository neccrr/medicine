import type { EbookMeta, Flashcard, QuizQuestion, Subject } from "../types/content";

// Every content type lives under content/{type}/block/{blockId}/... — one folder tree, laid
// out to match the curriculum's own block structure, sectioned the same way content/modules is.
// Vite bundles all matching JSON/MD files at build time — fully static, no server round-trip.
const flashcardModules = import.meta.glob<Flashcard[]>(
  "../../content/flashcards/block/*/*/deck.json",
  { eager: true, import: "default" },
);
const quizModules = import.meta.glob<QuizQuestion[]>(
  "../../content/quizzes/block/*/*/bank.json",
  { eager: true, import: "default" },
);
// Dedicated, curated question banks for a study block's exam (e.g. each sourced from a
// different real past exam) — a block can have more than one package to choose between.
// Falls back to pooling that block's regular quiz banks when none exist.
const examBankModules = import.meta.glob<QuizQuestion[]>(
  "../../content/exams/block/*/*/bank.json",
  { eager: true, import: "default" },
);
const examPackageMetaModules = import.meta.glob<{ name: string }>(
  "../../content/exams/block/*/*/meta.json",
  { eager: true, import: "default" },
);
const summaryModules = import.meta.glob<string>(
  "../../content/summaries/block/*/*.md",
  { eager: true, import: "default", query: "?raw" },
);
const tipsModule = import.meta.glob<string[]>("../../content/tips/tips.json", {
  eager: true,
  import: "default",
});
const ebookMetaModules = import.meta.glob<EbookMeta>(
  "../../content/ebooks/block/*/*/meta.json",
  { eager: true, import: "default" },
);
const ebookChapterModules = import.meta.glob<string>(
  "../../content/ebooks/block/*/*/chapter-*.md",
  { eager: true, import: "default", query: "?raw" },
);
// PDFs dropped into a subject's folder are copied to the build output and exposed as a URL —
// drop a file at content/ebooks/block/{blockId}/{subject}/anything.pdf and it shows up with no
// code changes.
const ebookPdfModules = import.meta.glob<string>("../../content/ebooks/block/*/*/*.pdf", {
  eager: true,
  import: "default",
  query: "?url",
});
// Self-contained interactive HTML quizzes (their own UI/scoring, e.g. an image-ID game) dropped
// into a subject's folder are exposed as a URL and embedded via iframe — no bank.json needed.
const quizGameModules = import.meta.glob<string>("../../content/quizzes/block/*/*/*.html", {
  eager: true,
  import: "default",
  query: "?url",
});
// Raw lecture-slide PDFs, organized by block then subject — drop a file at
// content/modules/block/{blockId}/{subjectId}/anything.pdf, or in a section subfolder such as
// .../{subjectId}/practicum/assistance/anything.pdf, and it shows up with no code changes.
const moduleModules = import.meta.glob<string>("../../content/modules/block/*/*/**/*.pdf", {
  eager: true,
  import: "default",
  query: "?url",
});

/** "{blockId}/{subjectId}" from any content path under content/{type}/block/{blockId}/{subject}... */
function keyFromPath(path: string): string {
  const match = path.match(/\/block\/([^/]+)\/([^/.]+)/);
  return match ? `${match[1]}/${match[2]}` : path;
}

function ebookChapterKey(path: string): string {
  const match = path.match(/ebooks\/block\/([^/]+)\/([^/]+)\/([^/]+)\.md$/);
  return match ? `${match[1]}/${match[2]}/${match[3]}` : path;
}

function pdfName(path: string): string {
  const match = path.match(/([^/]+)\.pdf$/);
  return match ? match[1].replace(/[-_]/g, " ") : "PDF";
}

/** Subfolder path between the subject folder and the file, e.g. "practicum/assistance" ("" if none). */
function moduleSection(path: string): string {
  const match = path.match(/modules\/block\/[^/]+\/[^/]+\/(.+)\/[^/]+\.pdf$/);
  return match ? match[1].toLowerCase() : "";
}

function examPackagePath(path: string): { blockId: string; packageId: string } {
  const match = path.match(/exams\/block\/([^/]+)\/([^/]+)\/(bank|meta)\.json$/);
  return match ? { blockId: match[1], packageId: match[2] } : { blockId: path, packageId: path };
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

function htmlName(path: string): string {
  const match = path.match(/([^/]+)\.html$/);
  return match ? match[1].replace(/[-_]/g, " ") : "Quiz";
}

function labelize(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

/**
 * The key every content map and every progress entry in localStorage uses: "{blockId}/{subjectId}".
 * A subject can have material in more than one block (physiology in 1.1 and 1.2), so the subject
 * id alone isn't unique.
 */
export function subjectKey(blockId: string, subjectId: string): string {
  return `${blockId}/${subjectId}`;
}

export function keyOf(subject: Pick<Subject, "id" | "blockId">): string {
  return subjectKey(subject.blockId, subject.id);
}

function subjectsFromKeys(keys: Iterable<string>, label: (key: string, id: string) => string = (_k, id) => labelize(id)): Subject[] {
  return Array.from(new Set(keys))
    .sort()
    .map((key) => {
      const [blockId, id] = key.split("/");
      return { id, blockId, label: label(key, id) };
    });
}

function keyedBy<T>(modules: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(modules).map(([path, value]) => [keyFromPath(path), value]));
}

function groupedBy<T>(modules: Record<string, string>, make: (path: string, url: string) => T, sortKey: (item: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const [path, url] of Object.entries(modules)) (out[keyFromPath(path)] ??= []).push(make(path, url));
  for (const list of Object.values(out)) list.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  return out;
}

/** Flashcard decks, keyed by "{blockId}/{subjectId}". */
export const flashcardDecks: Record<string, Flashcard[]> = keyedBy(flashcardModules);

/** Quiz banks, keyed by "{blockId}/{subjectId}". */
export const quizBanks: Record<string, QuizQuestion[]> = keyedBy(quizModules);

export interface ExamPackage {
  id: string;
  name: string;
  questions: QuizQuestion[];
}

/** Dedicated exam question packages, keyed by block id — a block may offer more than one. */
export const examPackagesByBlock: Record<string, ExamPackage[]> = {};
for (const [path, questions] of Object.entries(examBankModules)) {
  const { blockId, packageId } = examPackagePath(path);
  const meta = examPackageMetaModules[path.replace(/bank\.json$/, "meta.json")];
  (examPackagesByBlock[blockId] ??= []).push({
    id: packageId,
    name: meta?.name ?? labelize(packageId),
    questions,
  });
}
for (const list of Object.values(examPackagesByBlock)) {
  list.sort((a, b) => a.name.localeCompare(b.name));
}

/** Summaries, keyed by "{blockId}/{subjectId}" (from content/summaries/block/{blockId}/{subject}.md). */
export const summaries: Record<string, string> = keyedBy(summaryModules);

export const tips: string[] = Object.values(tipsModule)[0] ?? [];

export const flashcardSubjects: Subject[] = subjectsFromKeys(Object.keys(flashcardDecks));

export interface QuizGame {
  name: string;
  url: string;
}

/** Interactive HTML quizzes, keyed by "{blockId}/{subjectId}". */
export const quizGames: Record<string, QuizGame[]> = groupedBy(
  quizGameModules,
  (path, url) => ({ name: htmlName(path), url }),
  (g) => g.name,
);

export const quizSubjects: Subject[] = subjectsFromKeys([...Object.keys(quizBanks), ...Object.keys(quizGames)]);

/** Every quiz-bank question from the subjects whose quiz folder is in this block (pooled exam fallback). */
export function quizQuestionsInBlock(blockId: string): QuizQuestion[] {
  return quizSubjects.filter((s) => s.blockId === blockId).flatMap((s) => quizBanks[keyOf(s)] ?? []);
}

export const summarySubjects: Subject[] = subjectsFromKeys(Object.keys(summaries));

/** Ebook chapters, keyed by "{blockId}/{subjectId}/{chapterId}". */
export const ebookChapters: Record<string, string> = Object.fromEntries(
  Object.entries(ebookChapterModules).map(([path, markdown]) => [ebookChapterKey(path), markdown]),
);

export interface EbookPdf {
  name: string;
  url: string;
}

/** Ebook reference PDFs, keyed by "{blockId}/{subjectId}". */
export const ebookPdfs: Record<string, EbookPdf[]> = groupedBy(
  ebookPdfModules,
  (path, url) => ({ name: pdfName(path), url }),
  (p) => p.name,
);

// A subject folder that only contains PDFs (no meta.json/chapters) still gets a book entry,
// synthesized from the folder name — dropping a PDF in is enough on its own.
/** Ebook metadata, keyed by "{blockId}/{subjectId}". */
export const ebookMeta: Record<string, EbookMeta> = keyedBy(ebookMetaModules);
for (const key of Object.keys(ebookPdfs)) {
  ebookMeta[key] ??= {
    title: labelize(key.split("/")[1]),
    description: "PDF reference",
    chapters: [],
  };
}

export const ebookSubjects: Subject[] = subjectsFromKeys(Object.keys(ebookMeta), (key) => ebookMeta[key].title);

export interface ModulePdf {
  name: string;
  url: string;
  section: string;
}

/** Lecture-slide PDFs, keyed by "{blockId}/{subjectId}". */
export const modulesByBlockSubject: Record<string, ModulePdf[]> = groupedBy(
  moduleModules,
  (path, url) => ({ name: moduleName(path), url, section: moduleSection(path) }),
  (m) => m.name,
);

/** One entry per block a subject has module PDFs in. */
export const moduleSubjects: Subject[] = subjectsFromKeys(Object.keys(modulesByBlockSubject));
