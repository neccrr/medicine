export interface AccountConfig {
  /** False on deployments without the API (static hosting, plain `vite dev`): guest mode only. */
  accounts: boolean;
  google: boolean;
  /** AI explanations are configured on the server (they still need a signed-in student). */
  ai: boolean;
}

export interface AccountUser {
  id: string;
  name: string;
  email: string;
  cohort?: string | null;
  image?: string | null;
}

let configPromise: Promise<AccountConfig> | null = null;

/** Asks the server whether accounts are enabled. Any failure means guest-only. */
export function getAccountConfig(): Promise<AccountConfig> {
  configPromise ??= fetch("/api/config", { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok || !res.headers.get("content-type")?.includes("application/json")) {
        return { accounts: false, google: false, ai: false };
      }
      const data = (await res.json()) as Partial<AccountConfig>;
      return { accounts: data.accounts === true, google: data.google === true, ai: data.accounts === true && data.ai === true };
    })
    .catch(() => ({ accounts: false, google: false, ai: false }));
  return configPromise;
}

export const loadAuthClient = () => import("./authClient").then((m) => m.authClient);
