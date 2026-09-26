// The API for `npm run dev:api`: the same app as api/index.ts, backed by in-memory storage
// (MEDICINE_API=memory) or a real database (MONGODB_URI). Loaded by the Vite dev server.
import { memoryAdapter } from "better-auth/adapters/memory";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { createApp, type App } from "./app.js";
import { createAuth } from "./auth.js";
import { getMongo } from "./mongo.js";
import { MemoryProgressStore, MongoProgressStore, type ProgressStore } from "./progressStore.js";

let app: Promise<App> | null = null;

export function getDevApp(): Promise<App> {
  app ??= (async () => {
    const env = process.env;
    let store: ProgressStore;
    let database;
    if (env.MONGODB_URI) {
      const { client, db } = await getMongo(env.MONGODB_URI, env.MONGODB_DB || "medicine-dev");
      store = new MongoProgressStore(db);
      database = mongodbAdapter(db, { client });
    } else {
      store = new MemoryProgressStore();
      database = memoryAdapter({ user: [], session: [], account: [], verification: [], rateLimit: [] });
    }
    const auth = createAuth({
      database,
      secret: env.BETTER_AUTH_SECRET || "local-development-secret-not-for-production",
      trustedOrigins: ["http://localhost:*", "http://127.0.0.1:*"],
      onDeleteUser: (id) => store.deleteAll(id),
      rateLimit: false,
    });
    return createApp({ auth, store, googleEnabled: false });
  })();
  return app;
}
