import type { Db, IndexDescription } from "mongodb";

// Every MongoDB collection the app uses, with its indexes, in one place. Better Auth owns the
// first five (it creates no indexes on MongoDB itself); the app owns the rest. Index names
// match what earlier versions created, so existing databases don't hit a name conflict.

export const INDEXES: Record<string, IndexDescription[]> = {
  // Better Auth
  user: [{ key: { email: 1 }, unique: true }],
  session: [
    { key: { token: 1 }, unique: true },
    { key: { userId: 1 } },
    // MongoDB deletes each session once it expires (Better Auth stores real dates).
    { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: "expiry" },
  ],
  account: [{ key: { userId: 1 } }, { key: { providerId: 1, accountId: 1 } }],
  verification: [
    { key: { identifier: 1 } },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: "expiry" },
  ],
  rateLimit: [{ key: { key: 1 }, unique: true }],

  // App. One document per user per synced key: { userId, key, value, updatedAt, rev }.
  progress: [
    { key: { userId: 1, key: 1 }, unique: true, name: "user_key" },
    // Sync asks for "this user's keys changed since rev".
    { key: { userId: 1, rev: 1 }, name: "user_rev" },
  ],
  // One document per user: membership and per-key score parts (see leaderboard.ts).
  leaderboard: [
    { key: { userId: 1 }, unique: true, name: "user" },
    { key: { joined: 1 }, name: "joined" },
  ],
};

/** Creates any missing index; a no-op round trip per collection when they all exist. */
export async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all(Object.entries(INDEXES).map(([name, indexes]) => db.collection(name).createIndexes(indexes)));
}
