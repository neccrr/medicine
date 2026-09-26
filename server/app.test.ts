import { memoryAdapter } from "better-auth/adapters/memory";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp, type App } from "./app.js";
import { createAuth } from "./auth.js";
import { MemoryProgressStore } from "./progressStore.js";

const ORIGIN = "http://localhost:5173";

let app: App;
let store: MemoryProgressStore;

beforeEach(() => {
  store = new MemoryProgressStore();
  const auth = createAuth({
    database: memoryAdapter({ user: [], session: [], account: [], verification: [], rateLimit: [] }),
    secret: "test-secret-test-secret-test-secret-1234",
    baseURL: ORIGIN,
    trustedOrigins: [ORIGIN],
    onDeleteUser: (id) => store.deleteAll(id),
    rateLimit: false,
  });
  app = createApp({ auth, store, googleEnabled: false });
});

function req(path: string, init: { method?: string; body?: unknown; cookie?: string } = {}) {
  const headers = new Headers({ origin: ORIGIN });
  if (init.body !== undefined) headers.set("content-type", "application/json");
  if (init.cookie) headers.set("cookie", init.cookie);
  return app(
    new Request(ORIGIN + path, {
      method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    }),
  );
}

async function signUp(email = "student@example.com") {
  const res = await req("/api/auth/sign-up/email", { body: { email, password: "correct-horse-1", name: "Student" } });
  expect(res.status).toBe(200);
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  expect(cookie).toContain("session_token");
  return cookie;
}

const card = (reps: number) => ({ interval: 1, easeFactor: 2.5, dueDate: "2026-10-01", reps, lapses: 0 });

describe("API", () => {
  it("reports that accounts are available", async () => {
    expect(await (await req("/api/config")).json()).toEqual({ accounts: true, google: false });
  });

  it("refuses to sync without a session", async () => {
    expect((await req("/api/sync", { body: { since: 0, changes: [] } })).status).toBe(401);
  });

  it("stores changes and merges progress from two devices", async () => {
    const cookie = await signUp();
    const key = "medicine:flashcards:1.2/anatomy";

    const first = await (
      await req("/api/sync", { cookie, body: { since: 0, changes: [{ key, value: { a: card(3) }, updatedAt: 100 }] } })
    ).json();
    expect(first.entries).toEqual([{ key, value: { a: card(3) }, updatedAt: 100 }]);

    // A second device that studied a different card, and an older copy of the first one.
    const second = await (
      await req("/api/sync", {
        cookie,
        body: { since: 0, changes: [{ key, value: { a: card(1), b: card(2) }, updatedAt: 200 }] },
      })
    ).json();
    expect(second.entries).toEqual([{ key, value: { a: card(3), b: card(2) }, updatedAt: 200 }]);
  });

  it("returns only entries changed since the last sync (plus a small overlap)", async () => {
    const cookie = await signUp();
    const a = await (
      await req("/api/sync", { cookie, body: { since: 0, changes: [{ key: "medicine:activity", value: ["2026-09-01"], updatedAt: 1 }] } })
    ).json();
    const later = a.serverTime + 60_000;
    const b = await (await req("/api/sync", { cookie, body: { since: later, changes: [] } })).json();
    expect(b.entries).toEqual([]);
  });

  it("rejects keys that are not synced and malformed bodies", async () => {
    const cookie = await signUp();
    const bad = await req("/api/sync", { cookie, body: { since: 0, changes: [{ key: "medicine:theme", value: "dark", updatedAt: 1 }] } });
    expect(bad.status).toBe(400);
    expect((await req("/api/sync", { cookie, body: { since: -1, changes: [] } })).status).toBe(400);
  });

  it("keeps each user's progress separate", async () => {
    const alice = await signUp("alice@example.com");
    const bob = await signUp("bob@example.com");
    await req("/api/sync", { cookie: alice, body: { since: 0, changes: [{ key: "medicine:activity", value: ["2026-09-01"], updatedAt: 1 }] } });
    const res = await (await req("/api/sync", { cookie: bob, body: { since: 0, changes: [] } })).json();
    expect(res.entries).toEqual([]);
  });

  it("exports the account and deletes all progress with the account", async () => {
    const cookie = await signUp();
    await req("/api/sync", { cookie, body: { since: 0, changes: [{ key: "medicine:activity", value: ["2026-09-01"], updatedAt: 1 }] } });
    const exported = await (await req("/api/account/export", { cookie })).json();
    expect(exported.user.email).toBe("student@example.com");
    expect(exported.progress).toHaveLength(1);

    const del = await req("/api/auth/delete-user", { cookie, body: { password: "correct-horse-1" } });
    expect(del.status).toBe(200);
    expect(await store.all(exported.user.id)).toEqual([]);
    expect((await req("/api/sync", { cookie, body: { since: 0, changes: [] } })).status).toBe(401);
  });
});
