import type { Db } from "mongodb";
import type { DriveFile, DriveFileKind, DriveFolder, DriveTree } from "../src/lib/driveTypes.js";

// The class's shared Google Drive folder, listed through the Drive API with an API key (the
// folder is shared by link, so no Google sign-in is needed). The whole tree is walked and kept
// for a few minutes, so files added to or removed from Drive show up on the next refresh. The
// latest listing is also saved to the database, so a cold start doesn't have to walk it first.

export interface DriveConfig {
  apiKey: string;
  folderId: string;
  /** The Drive API's address; tests point it at a fake. */
  apiBase: string;
  /** How long a listing is used before Drive is asked again. */
  ttlMs: number;
}

const ID_RE = /^[A-Za-z0-9_-]{10,100}$/;
const FOLDER = "application/vnd.google-apps.folder";
const SHORTCUT = "application/vnd.google-apps.shortcut";
/** Limits on one walk, so a huge or looping folder can't run away. */
const MAX_FOLDERS = 600;
const MAX_DEPTH = 10;
const CONCURRENCY = 8;
const REQUEST_TIMEOUT_MS = 15_000;
/** A stale listing waits this long for a fresh one before being served as it is. */
const STALE_WAIT_MS = 3_000;
/** After a failed walk, Drive isn't asked again for this long. */
const RETRY_AFTER_MS = 30_000;
/** A student's "refresh" only reaches Drive when the listing is at least this old. */
const MIN_FORCED_AGE_MS = 30_000;

/** The Drive settings, or undefined when the class Drive isn't connected. */
export function driveConfigFromEnv(env: Record<string, string | undefined>): DriveConfig | undefined {
  const apiKey = env.GOOGLE_DRIVE_API_KEY?.trim();
  // Either the folder id or its share link.
  const raw = env.GOOGLE_DRIVE_FOLDER_ID?.trim() ?? "";
  const folderId = /\/folders\/([A-Za-z0-9_-]+)/.exec(raw)?.[1] ?? raw;
  if (!apiKey || !ID_RE.test(folderId)) return undefined;
  const minutes = Number(env.GOOGLE_DRIVE_REFRESH_MINUTES);
  return {
    apiKey,
    folderId,
    apiBase: env.GOOGLE_DRIVE_API_URL?.replace(/\/$/, "") || "https://www.googleapis.com/drive/v3",
    ttlMs: (Number.isFinite(minutes) && minutes >= 1 ? minutes : 5) * 60_000,
  };
}

export function kindOf(mimeType: string, name: string): DriveFileKind {
  const ext = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? "";
  if (mimeType === "application/pdf" || ext === "pdf") return "pdf";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint") || ["ppt", "pptx", "key", "odp"].includes(ext)) return "slides";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || ["xls", "xlsx", "csv", "ods"].includes(ext)) return "sheet";
  if (mimeType.includes("document") || mimeType.includes("msword") || mimeType.startsWith("text/") || ["doc", "docx", "txt", "rtf", "odt"].includes(ext)) return "document";
  return "other";
}

interface ApiFile {
  id?: string;
  name?: string;
  mimeType?: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  parents?: string[];
  shortcutDetails?: { targetId?: string; targetMimeType?: string };
}

const byName = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/** Folders listed in one request: their ids go into one query, joined with "or". */
const FOLDERS_PER_REQUEST = 25;

/** Every item directly inside any of these folders, page by page. */
async function listChildren(config: DriveConfig, folderIds: readonly string[], fetchImpl: typeof fetch): Promise<ApiFile[]> {
  const out: ApiFile[] = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      q: `(${folderIds.map((id) => `'${id}' in parents`).join(" or ")}) and trashed = false`,
      fields: "nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,parents,shortcutDetails(targetId,targetMimeType))",
      pageSize: "1000",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
      key: config.apiKey,
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetchImpl(`${config.apiBase}/files?${params}`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`Drive answered ${res.status} listing a folder`);
    const body = (await res.json()) as { files?: ApiFile[]; nextPageToken?: string };
    out.push(...(body.files ?? []));
    pageToken = body.nextPageToken ?? "";
  } while (pageToken);
  return out;
}

/** Runs the tasks, at most `limit` at a time. */
async function inPool<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: (T | undefined)[] = Array.from({ length: tasks.length }, () => undefined);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const i = next++;
      const task = tasks.at(i);
      if (task) results.splice(i, 1, await task());
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results.filter((r): r is T => r !== undefined);
}

type Pending = { id: string; folder: DriveFolder; depth: number };

/**
 * Walks the whole folder tree, level by level, listing many folders per request (a semester
 * of about 150 folders takes around ten requests instead of 150). Only the top folder failing
 * to list is an error.
 */
export async function crawlDrive(config: DriveConfig, fetchImpl: typeof fetch = fetch, now: () => number = Date.now): Promise<DriveTree> {
  const root: DriveFolder = { name: "", folders: [], files: [] };
  const seen = new Set([config.folderId]);
  let complete = true;

  /** Files the items into their folders, and returns the subfolders to list next. */
  const place = (items: ApiFile[], byId: Map<string, Pending>, fallback?: Pending): Pending[] => {
    const next: Pending[] = [];
    for (const item of items) {
      const name = item.name?.trim();
      if (!item.id || !name) continue;
      const parent = fallback ?? item.parents?.map((p) => byId.get(p)).find((p) => p !== undefined);
      if (!parent) continue;
      const isShortcut = item.mimeType === SHORTCUT;
      const targetId = isShortcut ? item.shortcutDetails?.targetId : item.id;
      const mimeType = (isShortcut ? item.shortcutDetails?.targetMimeType : item.mimeType) ?? "";
      if (!targetId || !ID_RE.test(targetId)) continue;
      if (mimeType === FOLDER) {
        // A shortcut can point back up the tree: each folder is walked once.
        if (seen.has(targetId)) continue;
        if (parent.depth + 1 > MAX_DEPTH || seen.size >= MAX_FOLDERS) {
          complete = false;
          continue;
        }
        seen.add(targetId);
        const child: DriveFolder = { name, folders: [], files: [] };
        parent.folder.folders.push(child);
        next.push({ id: targetId, folder: child, depth: parent.depth + 1 });
      } else {
        const size = Number(item.size);
        const file: DriveFile = {
          id: targetId,
          name,
          kind: kindOf(mimeType, name),
          size: item.size !== undefined && Number.isFinite(size) ? size : null,
          modifiedTime: item.modifiedTime ?? "",
        };
        if (item.createdTime) file.createdTime = item.createdTime;
        parent.folder.files.push(file);
      }
    }
    return next;
  };

  /** One request for a batch; if it fails, each folder on its own, so one bad folder stays one. */
  const listBatch = async (batch: Pending[]): Promise<Pending[]> => {
    const byId = new Map(batch.map((p) => [p.id, p]));
    try {
      return place(await listChildren(config, batch.map((p) => p.id), fetchImpl), byId, batch.length === 1 ? batch.at(0) : undefined);
    } catch (err) {
      if (batch.length === 1) {
        if (batch.at(0)?.folder === root) throw err;
        complete = false;
        return [];
      }
      const each = await inPool(batch.map((p) => () => listBatch([p])), CONCURRENCY);
      return each.flat();
    }
  };

  let level: Pending[] = [{ id: config.folderId, folder: root, depth: 0 }];
  while (level.length > 0) {
    const batches: Pending[][] = [];
    for (let i = 0; i < level.length; i += FOLDERS_PER_REQUEST) batches.push(level.slice(i, i + FOLDERS_PER_REQUEST));
    level = (await inPool(batches.map((b) => () => listBatch(b)), CONCURRENCY)).flat();
  }

  const sortAll = (folder: DriveFolder) => {
    folder.folders.sort((a, b) => byName.compare(a.name, b.name));
    folder.files.sort((a, b) => byName.compare(a.name, b.name));
    folder.folders.forEach(sortAll);
  };
  sortAll(root);
  return { root, updatedAt: now(), complete };
}

/** Where the latest listing is kept between cold starts. */
export interface DriveSnapshotStore {
  load(): Promise<DriveTree | null>;
  save(tree: DriveTree): Promise<void>;
}

export class MemoryDriveSnapshotStore implements DriveSnapshotStore {
  private tree: DriveTree | null = null;
  async load() {
    return this.tree;
  }
  async save(tree: DriveTree) {
    this.tree = tree;
  }
}

/** One document in the driveSnapshot collection. */
export class MongoDriveSnapshotStore implements DriveSnapshotStore {
  private db: Db;
  constructor(db: Db) {
    this.db = db;
  }
  private get col() {
    return this.db.collection<{ _id: string; tree: DriveTree }>("driveSnapshot");
  }
  async load() {
    return (await this.col.findOne({ _id: "tree" }))?.tree ?? null;
  }
  async save(tree: DriveTree) {
    await this.col.replaceOne({ _id: "tree" }, { tree }, { upsert: true });
  }
}

/** The listing the API serves: fresh enough, walked at most once at a time. */
export class DriveIndex {
  private current: DriveTree | null = null;
  private loaded = false;
  private walking: Promise<DriveTree> | null = null;
  private failedAt = -Infinity;
  private config: DriveConfig;
  private snapshots: DriveSnapshotStore;
  private fetchImpl: typeof fetch;
  private now: () => number;

  constructor(
    config: DriveConfig,
    snapshots: DriveSnapshotStore = new MemoryDriveSnapshotStore(),
    fetchImpl: typeof fetch = fetch,
    now: () => number = Date.now,
  ) {
    this.config = config;
    this.snapshots = snapshots;
    this.fetchImpl = fetchImpl;
    this.now = now;
  }

  /** The folder tree. `refresh` asks Drive again unless the listing is very recent. */
  async tree({ refresh = false } = {}): Promise<DriveTree> {
    if (!this.loaded) {
      this.loaded = true;
      this.current = await this.snapshots.load().catch(() => null);
    }
    const current = this.current;
    const age = current ? this.now() - current.updatedAt : Infinity;
    const wanted = refresh ? age >= MIN_FORCED_AGE_MS : age >= this.config.ttlMs;
    const failedRecently = this.now() - this.failedAt < RETRY_AFTER_MS;
    if (current && (!wanted || failedRecently)) return current;
    if (!current) {
      if (failedRecently && !this.walking) throw new Error("The class Drive failed to list a moment ago");
      return this.walk();
    }
    // A stale listing is served if Drive is slow; the walk carries on for the next request.
    const timeout = new Promise<DriveTree>((resolve) => setTimeout(() => { resolve(current); }, STALE_WAIT_MS));
    return Promise.race([this.walk().catch(() => current), timeout]);
  }

  private walk(): Promise<DriveTree> {
    this.walking ??= crawlDrive(this.config, this.fetchImpl, this.now)
      .then((tree) => {
        this.current = tree;
        this.snapshots.save(tree).catch((err: unknown) => { console.error("Saving the Drive listing failed", err); });
        return tree;
      })
      .catch((err: unknown) => {
        this.failedAt = this.now();
        console.error("Listing the class Drive failed", err);
        throw err;
      })
      .finally(() => {
        this.walking = null;
      });
    return this.walking;
  }
}
