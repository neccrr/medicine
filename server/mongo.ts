import { MongoClient, type Db } from "mongodb";

// Serverless functions are re-invoked in warm containers; keep one client per container instead
// of opening a new connection pool on every request.
const globalCache = globalThis as unknown as { __medicineMongo?: Promise<{ client: MongoClient; db: Db }> };

export function getMongo(uri: string, dbName: string): Promise<{ client: MongoClient; db: Db }> {
  globalCache.__medicineMongo ??= (async () => {
    const client = new MongoClient(uri, {
      maxPoolSize: 5,
      appName: "medicine",
      // Give up after 5s instead of the driver's 30s when the cluster can't be reached (network
      // access list, outage), so requests fail fast with a clear 503.
      serverSelectionTimeoutMS: 5000,
    });
    await client.connect();
    return { client, db: client.db(dbName) };
  })().catch((err) => {
    globalCache.__medicineMongo = undefined;
    throw err;
  });
  return globalCache.__medicineMongo;
}
