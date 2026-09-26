// Vercel Function: the app's whole API. vercel.json rewrites /api/* here, keeping the original
// URL, and server/app.ts routes by path. Without MONGODB_URI and BETTER_AUTH_SECRET every route
// answers 503, and the app keeps working as a guest-only static site.
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { createApp, type App } from "../server/app.js";
import { createAuth } from "../server/auth.js";
import { publicUrlFromEnv, trustedOriginsFromEnv } from "../server/env.js";
import { ensureAuthIndexes, getMongo } from "../server/mongo.js";
import { MongoProgressStore } from "../server/progressStore.js";

let app: Promise<App> | null = null;

function build(): Promise<App> {
  const env = process.env;
  const uri = env.MONGODB_URI;
  const secret = env.BETTER_AUTH_SECRET;
  if (!uri || !secret) throw new Error("MONGODB_URI and BETTER_AUTH_SECRET must be set.");
  return getMongo(uri, env.MONGODB_DB || "medicine").then(async ({ client, db }) => {
    await ensureAuthIndexes(db);
    const store = new MongoProgressStore(db);
    const google =
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
        : undefined;
    const auth = createAuth({
      database: mongodbAdapter(db, { client }),
      secret,
      baseURL: publicUrlFromEnv(env),
      trustedOrigins: trustedOriginsFromEnv(env),
      google,
      onDeleteUser: (userId) => store.deleteAll(userId),
      rateLimit: "database",
    });
    return createApp({ auth, store, googleEnabled: Boolean(google) });
  });
}

async function handle(request: Request): Promise<Response> {
  try {
    app ??= build();
    return await (await app)(request);
  } catch (err) {
    app = null;
    console.error(err);
    return new Response(JSON.stringify({ error: "Accounts are not available right now." }), {
      status: 503,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
