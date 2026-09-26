import { MongoClient, type Db } from "mongodb";

// Serverless functions are re-invoked in warm containers; keep one client per container instead
// of opening a new connection pool on every request.
const globalCache = globalThis as unknown as { __medicineMongo?: Promise<{ client: MongoClient; db: Db }> };

export function getMongo(uri: string, dbName: string): Promise<{ client: MongoClient; db: Db }> {
  globalCache.__medicineMongo ??= (async () => {
    const client = new MongoClient(uri, { maxPoolSize: 5, appName: "medicine" });
    await client.connect();
    return { client, db: client.db(dbName) };
  })().catch((err) => {
    globalCache.__medicineMongo = undefined;
    throw err;
  });
  return globalCache.__medicineMongo;
}

/**
 * Indexes for the lookups Better Auth makes (it doesn't create any itself on MongoDB). Idempotent;
 * run once per cold start.
 */
export async function ensureAuthIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection("user").createIndex({ email: 1 }, { unique: true }),
    db.collection("session").createIndex({ token: 1 }, { unique: true }),
    db.collection("session").createIndex({ userId: 1 }),
    db.collection("account").createIndex({ userId: 1 }),
    db.collection("account").createIndex({ providerId: 1, accountId: 1 }),
    db.collection("verification").createIndex({ identifier: 1 }),
    db.collection("rateLimit").createIndex({ key: 1 }, { unique: true }),
  ]);
}
