import { betterAuth, type BetterAuthOptions } from "better-auth";

export interface AuthConfig {
  database: BetterAuthOptions["database"];
  secret: string;
  /** Public origin of the app, e.g. https://medicine.vercel.app. Inferred from requests if unset. */
  baseURL?: string;
  trustedOrigins: string[];
  google?: { clientId: string; clientSecret: string };
  /** Removes everything else stored for a user when they delete their account. */
  onDeleteUser: (userId: string) => Promise<void>;
  /**
   * Rate-limit storage: "database" in production, where each function instance has its own
   * memory; false turns limiting off (tests, local dev).
   */
  rateLimit: "memory" | "database" | false;
}

export function createAuth(config: AuthConfig) {
  return betterAuth({
    appName: "Medicine",
    database: config.database,
    secret: config.secret,
    baseURL: config.baseURL,
    basePath: "/api/auth",
    trustedOrigins: config.trustedOrigins,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    socialProviders: config.google
      ? { google: { clientId: config.google.clientId, clientSecret: config.google.clientSecret } }
      : undefined,
    user: {
      additionalFields: {
        // Cohort (angkatan), e.g. "2025"; used later to compare scores within a class.
        cohort: { type: "string", required: false, input: true },
      },
      deleteUser: {
        enabled: true,
        beforeDelete: async (user) => {
          await config.onDeleteUser(user.id);
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 60, // 60 days: a study app should not keep asking students to sign in
      updateAge: 60 * 60 * 24,
    },
    rateLimit: config.rateLimit ? { enabled: true, storage: config.rateLimit } : { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;
