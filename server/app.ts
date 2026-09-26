import { isSyncableKey, mergeEntry, type SyncEntry } from "../src/lib/syncMerge.js";
import type { Auth } from "./auth.js";
import type { ProgressStore, StoredEntry } from "./progressStore.js";

const MAX_BODY_BYTES = 2_000_000;
const MAX_CHANGES = 1000;
// Changes written by another device while this request ran could get a slightly earlier rev
// than our "since"; re-sending the last few seconds costs little (merging is idempotent).
const OVERLAP_MS = 5000;

export interface AppDeps {
  auth: Auth;
  store: ProgressStore;
  googleEnabled: boolean;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

const error = (status: number, message: string) => json({ error: message }, status);

function isChange(c: unknown, now: number): c is SyncEntry {
  if (typeof c !== "object" || c === null) return false;
  const { key, updatedAt, value } = c as Record<string, unknown>;
  return (
    typeof key === "string" &&
    isSyncableKey(key) &&
    typeof updatedAt === "number" &&
    Number.isFinite(updatedAt) &&
    updatedAt >= 0 &&
    updatedAt <= now + 86_400_000 &&
    value !== undefined
  );
}

/** The whole API as one fetch-style handler: auth, config, sync and account export. */
export function createApp({ auth, store, googleEnabled }: AppDeps) {
  async function userId(request: Request): Promise<string | null> {
    const session = await auth.api.getSession({ headers: request.headers });
    return session?.user.id ?? null;
  }

  async function sync(request: Request, uid: string): Promise<Response> {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return error(413, "Too much data in one sync.");
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return error(400, "Invalid JSON.");
    }
    const { since, changes } = (body ?? {}) as { since?: unknown; changes?: unknown };
    if (typeof since !== "number" || !Number.isFinite(since) || since < 0) return error(400, "Invalid 'since'.");
    if (!Array.isArray(changes) || changes.length > MAX_CHANGES) return error(400, "Invalid 'changes'.");

    const start = Date.now();
    const valid = changes.filter((c) => isChange(c, start));
    if (valid.length !== changes.length) return error(400, "Some changes were invalid.");

    const existing = await store.get(uid, [...new Set(valid.map((c) => c.key))]);
    const writes = new Map<string, StoredEntry>();
    for (const change of valid) {
      const current = writes.get(change.key) ?? existing.get(change.key);
      const merged = current ? mergeEntry(current, change) : change;
      writes.set(change.key, { key: change.key, value: merged.value, updatedAt: merged.updatedAt, rev: start });
    }
    await store.put(uid, [...writes.values()]);

    const entries = await store.changedSince(uid, since > 0 ? since - OVERLAP_MS : 0);
    return json({
      serverTime: start,
      entries: entries.map(({ key, value, updatedAt }) => ({ key, value, updatedAt })),
    });
  }

  async function exportAccount(request: Request, uid: string): Promise<Response> {
    const session = await auth.api.getSession({ headers: request.headers });
    const user = session?.user as Record<string, unknown> | undefined;
    const progress = await store.all(uid);
    return json({
      exportedAt: new Date().toISOString(),
      user: user && {
        id: user.id,
        name: user.name,
        email: user.email,
        cohort: user.cohort ?? null,
        createdAt: user.createdAt,
      },
      progress: progress.map(({ key, value, updatedAt }) => ({ key, value, updatedAt: new Date(updatedAt).toISOString() })),
    });
  }

  return async function handle(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    try {
      if (pathname.startsWith("/api/auth/")) return await auth.handler(request);
      if (pathname === "/api/config" && request.method === "GET") {
        return json({ accounts: true, google: googleEnabled });
      }
      if (pathname === "/api/sync" || pathname === "/api/account/export") {
        const uid = await userId(request);
        if (!uid) return error(401, "Sign in to sync.");
        if (pathname === "/api/sync" && request.method === "POST") return await sync(request, uid);
        if (pathname === "/api/account/export" && request.method === "GET") return await exportAccount(request, uid);
        return error(405, "Method not allowed.");
      }
      return error(404, "Not found.");
    } catch (err) {
      console.error(err);
      return error(500, "Something went wrong on the server.");
    }
  };
}

export type App = ReturnType<typeof createApp>;
