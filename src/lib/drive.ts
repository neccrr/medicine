import type { DriveFile, DriveFolder, DriveTree } from "./driveTypes";

// The class Google Drive (see server/drive.ts): fetching the listing for a signed-in student, and
// finding a block's or subject's folder in it by name ("BLOCK 1.2 …" / "ANATOMY").

export type DriveResult = { ok: true; tree: DriveTree } | { ok: false; status: number; message: string };

export async function fetchDrive({ refresh = false } = {}): Promise<DriveResult> {
  try {
    const res = await fetch(`/api/drive${refresh ? "?refresh=1" : ""}`, { credentials: "same-origin" });
    const body = (await res.json().catch(() => null)) as (DriveTree & { error?: string }) | null;
    if (!res.ok || !body?.root) return { ok: false, status: res.status, message: body?.error ?? "Couldn't load the class Drive." };
    return { ok: true, tree: body };
  } catch {
    return { ok: false, status: 0, message: "You're offline, or the server can't be reached." };
  }
}

/** The folder at a path of folder names from the top, or null. */
export function folderAt(root: DriveFolder, path: readonly string[]): DriveFolder | null {
  let folder: DriveFolder | undefined = root;
  for (const name of path) {
    folder = folder.folders.find((f) => f.name === name);
    if (!folder) return null;
  }
  return folder;
}

/** The path (folder names) to the first folder, depth first, that matches. */
export function findFolderPath(root: DriveFolder, matches: (folder: DriveFolder) => boolean, maxDepth = 4): string[] | null {
  const walk = (folder: DriveFolder, path: string[]): string[] | null => {
    for (const child of folder.folders) {
      const childPath = [...path, child.name];
      if (matches(child)) return childPath;
    }
    if (path.length >= maxDepth) return null;
    for (const child of folder.folders) {
      const found = walk(child, [...path, child.name]);
      if (found) return found;
    }
    return null;
  };
  return walk(root, []);
}

/** "BLOCK 1.2 INTEGUMEN SYSTEM…" → "1.2". */
export function blockIdOf(folderName: string): string | null {
  return /\bblock\s*(\d+(?:\.\d+)+)/i.exec(folderName)?.[1] ?? null;
}

const letters = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/** Folder names a subject goes by, in English and Indonesian. */
const SUBJECT_NAMES = new Map([
  ["anatomy", ["anatomy", "anatomi"]],
  ["physiology", ["physiology", "fisiologi"]],
  ["histology", ["histology", "histologi"]],
  ["biochem", ["biochem", "biochemistry", "biokimia"]],
]);

export function isSubjectFolder(folderName: string, subjectId: string): boolean {
  const name = letters(folderName);
  const names = SUBJECT_NAMES.get(subjectId) ?? [subjectId];
  return names.some((n) => letters(n) === name);
}

export function blockFolderPath(root: DriveFolder, blockId: string): string[] | null {
  return findFolderPath(root, (f) => blockIdOf(f.name) === blockId);
}

/** The path to a subject's folder inside its block's folder. */
export function subjectFolderPath(root: DriveFolder, blockId: string, subjectId: string): string[] | null {
  const blockPath = blockFolderPath(root, blockId);
  const block = blockPath && folderAt(root, blockPath);
  if (!blockPath || !block) return null;
  const subject = block.folders.find((f) => isSubjectFolder(f.name, subjectId));
  return subject ? [...blockPath, subject.name] : null;
}

export function countFiles(folder: DriveFolder): number {
  return folder.files.length + folder.folders.reduce((n, f) => n + countFiles(f), 0);
}

export interface DriveFileGroup {
  /** The subfolders the files are in, from the folder looked at ("Lecture · PPTs"); "" for its own. */
  label: string;
  path: string[];
  files: DriveFile[];
}

/** A folder's files grouped by the subfolder they're in, top to bottom. */
export function fileGroups(folder: DriveFolder, path: string[] = []): DriveFileGroup[] {
  const own = folder.files.length ? [{ label: path.map(niceName).join(" · "), path, files: folder.files }] : [];
  return [...own, ...folder.folders.flatMap((f) => fileGroups(f, [...path, f.name]))];
}

/** Every file under a folder, with the folder path it's in. */
export function allFiles(folder: DriveFolder, path: string[] = []): { file: DriveFile; path: string[] }[] {
  return [...folder.files.map((file) => ({ file, path })), ...folder.folders.flatMap((f) => allFiles(f, [...path, f.name]))];
}

/** "PRACTICUM" → "Practicum"; names with lower case letters are left as they are. */
export function niceName(name: string): string {
  if (name !== name.toUpperCase()) return name;
  return name
    .toLowerCase()
    .replace(/(^|[\s(-])(\p{L})/gu, (_m, pre: string, c: string) => pre + c.toUpperCase())
    // Abbreviations stay in capitals: UB (ujian blok), the faculty's names.
    .replace(/\b(Ub|Iup|Fk|Uns|Osce|Csl)\b/g, (w) => w.toUpperCase());
}

/** The file name without its extension, for lists. */
export function fileTitle(name: string): string {
  return name.replace(/\.(pptx?|pdf|docx?|xlsx?|mp4|mov|m4a|mp3|key|odp)$/i, "").trim();
}

/** The Class Drive page at a folder (by folder names), optionally with a file open. */
export function driveHref(path: readonly string[], fileId?: string): string {
  const params = new URLSearchParams();
  for (const name of path) params.append("f", name);
  if (fileId) params.set("file", fileId);
  const qs = params.toString();
  return qs ? `/drive?${qs}` : "/drive";
}

export const drivePreviewUrl = (id: string) => `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;
export const driveViewUrl = (id: string) => `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;

export function formatSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

/** "just now", "4 min ago", "2 h ago". */
export function updatedAgo(at: number, now: number = Date.now()): string {
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.floor(hours / 24)} d ago`;
}
