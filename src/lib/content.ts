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

function subjectFromPath(path: string): string {
  const match = path.match(/\/([^/]+)\/(deck|bank|meta)\.json$/);
  return match ? match[1] : path;
}

function subjectFromMdPath(path: string): string {
  const match = path.match(/\/([^/]+)\.md$/);
  return match ? match[1] : path;
}

function ebookChapterKey(path: string): string {
  const match = path.match(/ebooks\/block\/[^/]+\/([^/]+)\/([^/]+)\.md$/);
  return match ? `${match[1]}/${match[2]}` : path;
}

function ebookPdfSubject(path: string): string {
  const match = path.match(/ebooks\/block\/[^/]+\/([^/]+)\/[^/]+\.pdf$/);
  return match ? match[1] : path;
}

function pdfName(path: string): string {
  const match = path.match(/([^/]+)\.pdf$/);
  return match ? match[1].replace(/[-_]/g, " ") : "PDF";
}

function moduleKey(path: string): string {
  const match = path.match(/modules\/block\/([^/]+)\/([^/]+)\//);
  return match ? `${match[1]}/${match[2]}` : path;
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

function quizGameSubject(path: string): string {
  const match = path.match(/quizzes\/block\/[^/]+\/([^/]+)\/[^/]+\.html$/);
  return match ? match[1] : path;
}

function htmlName(path: string): string {
  const match = path.match(/([^/]+)\.html$/);
  return match ? match[1].replace(/[-_]/g, " ") : "Quiz";
}

function blockFromPath(path: string): string {
  const match = path.match(/\/block\/([^/]+)\//);
  return match ? match[1] : "";
}

/**
 * Content keys stay subject ids within one content type; this records each subject's block for
 * that type (from its folder) and notes any subject that appears in two blocks of the same type,
 * which the id-keyed maps can't hold apart. contentIntegrity.test.ts asserts there are none.
 */
export const subjectBlockCollisions: string[] = [];
function blockBySubject(paths: string[], subjectOf: (path: string) => string, kind: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const path of paths) {
    const id = subjectOf(path);
    const blockId = blockFromPath(path);
    if (out[id] && out[id] !== blockId) subjectBlockCollisions.push(`${kind}:${id} in ${out[id]} and ${blockId}`);
    out[id] = blockId;
  }
  return out;
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

export const summaries: Record<string, string> = Object.fromEntries(
  Object.entries(summaryModules).map(([path, markdown]) => [
    subjectFromMdPath(path),
    markdown,
  ]),
);

export const tips: string[] = Object.values(tipsModule)[0] ?? [];

const flashcardBlocks = blockBySubject(Object.keys(flashcardModules), subjectFromPath, "flashcards");
export const flashcardSubjects: Subject[] = Object.keys(flashcardDecks)
  .sort()
  .map((id) => ({ id, label: labelize(id), blockId: flashcardBlocks[id] }));

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

const quizBlocks = {
  ...blockBySubject(Object.keys(quizGameModules), quizGameSubject, "quiz games"),
  ...blockBySubject(Object.keys(quizModules), subjectFromPath, "quizzes"),
};
export const quizSubjects: Subject[] = Array.from(
  new Set([...Object.keys(quizBanks), ...Object.keys(quizGames)]),
)
  .sort()
  .map((id) => ({ id, label: labelize(id), blockId: quizBlocks[id] }));

/** Every quiz-bank question from the subjects whose quiz folder is in this block (pooled exam fallback). */
export function quizQuestionsInBlock(blockId: string): QuizQuestion[] {
  return quizSubjects.filter((s) => s.blockId === blockId).flatMap((s) => quizBanks[s.id] ?? []);
}

const summaryBlocks = blockBySubject(Object.keys(summaryModules), subjectFromMdPath, "summaries");
export const summarySubjects: Subject[] = Object.keys(summaries)
  .sort()
  .map((id) => ({ id, label: labelize(id), blockId: summaryBlocks[id] }));

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

const ebookBlocks = {
  ...blockBySubject(Object.keys(ebookPdfModules), ebookPdfSubject, "ebook PDFs"),
  ...blockBySubject(Object.keys(ebookChapterModules), (p) => ebookChapterKey(p).split("/")[0], "ebook chapters"),
  ...blockBySubject(Object.keys(ebookMetaModules), subjectFromPath, "ebooks"),
};
export const ebookSubjects: Subject[] = Object.keys(ebookMeta)
  .sort()
  .map((id) => ({ id, label: ebookMeta[id].title, blockId: ebookBlocks[id] }));

export interface ModulePdf {
  name: string;
  url: string;
  section: string;
}

/** Lecture-slide PDFs, keyed by "{blockId}/{subjectId}". */
export const modulesByBlockSubject: Record<string, ModulePdf[]> = {};
for (const [path, url] of Object.entries(moduleModules)) {
  const key = moduleKey(path);
  (modulesByBlockSubject[key] ??= []).push({ name: moduleName(path), url, section: moduleSection(path) });
}
for (const list of Object.values(modulesByBlockSubject)) {
  list.sort((a, b) => a.name.localeCompare(b.name));
}

/** One entry per block a subject has module PDFs in; modules are already keyed by block. */
export const moduleSubjects: Subject[] = Object.keys(modulesByBlockSubject)
  .sort()
  .map((key) => {
    const [blockId, id] = key.split("/");
    return { id, label: labelize(id), blockId };
  });
