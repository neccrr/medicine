import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AccountContext, type AccountContextValue, type AccountStatus, type SyncStatus } from "./accountContextValue";
import { getAccountConfig, loadAuthClient, type AccountConfig, type AccountUser } from "../lib/account";
import { clearLocalProgress, clearSyncState, pendingChangeCount, readSyncState, syncNow } from "../lib/sync";
import { DIRTY_EVENT } from "../lib/syncDirty";

const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const SYNC_DEBOUNCE_MS = 4000;

function errorMessage(error: { message?: string; status?: number } | null | undefined, fallback: string): string {
  if (!error) return fallback;
  if (error.status === 429) return "Too many attempts. Wait a minute and try again.";
  return error.message || fallback;
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AccountConfig | null>(null);
  const [status, setStatus] = useState<AccountStatus>("checking");
  const [user, setUser] = useState<AccountUser | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [sync, setSync] = useState<SyncStatus>(() => ({
    phase: "idle",
    lastSyncedAt: readSyncState()?.lastSyncedAt,
    pending: pendingChangeCount(),
  }));
  const userRef = useRef<AccountUser | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const runSync = useCallback(async (options: { keepalive?: boolean } = {}) => {
    const current = userRef.current;
    if (!current) return;
    const first = readSyncState()?.userId !== current.id;
    setSync((s) => ({ ...s, phase: "syncing", message: undefined }));
    const result = await syncNow(current.id, options);
    if (result.status === "ok") {
      setSync({ phase: "idle", lastSyncedAt: Date.now(), pending: pendingChangeCount() });
      if (first && result.applied.length > 0) setDataVersion((v) => v + 1);
    } else if (result.status === "signed-out") {
      setUser(null);
      setStatus("guest");
      setSync((s) => ({ ...s, phase: "idle", pending: pendingChangeCount() }));
    } else {
      setSync((s) => ({ ...s, phase: "error", message: result.message, pending: pendingChangeCount() }));
    }
  }, []);

  const applySession = useCallback((sessionUser: AccountUser | null | undefined) => {
    if (sessionUser) {
      setUser({
        id: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
        cohort: sessionUser.cohort ?? null,
        image: sessionUser.image ?? null,
      });
      setStatus("signed-in");
    } else {
      setUser(null);
      setStatus("guest");
    }
  }, []);

  const checkSession = useCallback(async () => {
    const cfg = await getAccountConfig();
    if (!cfg.accounts) return;
    const client = await loadAuthClient();
    const { data } = await client.getSession();
    applySession(data?.user as AccountUser | undefined);
  }, [applySession]);

  // Startup: find out whether accounts exist here, and only load the auth client for devices
  // that have signed in before. Guests never download it until they open the Account page.
  useEffect(() => {
    let cancelled = false;
    getAccountConfig().then(async (cfg) => {
      if (cancelled) return;
      setConfig(cfg);
      if (!cfg.accounts) return setStatus("unavailable");
      if (!readSyncState()) return setStatus("guest");
      try {
        await checkSession();
      } catch {
        // Offline at startup: stay a guest for now; local progress is still here.
        if (!cancelled) setStatus("guest");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [checkSession]);

  // While signed in: sync now, then on a timer, when the tab regains focus or the network
  // returns, a few seconds after local changes, and (best effort) when the tab is hidden.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    void runSync();
    let debounce: number | undefined;
    const onDirty = () => {
      setSync((s) => ({ ...s, pending: pendingChangeCount() }));
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => void runSync(), SYNC_DEBOUNCE_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void runSync();
      else if (pendingChangeCount() > 0) void runSync({ keepalive: true });
    };
    const onOnline = () => void runSync();
    const interval = window.setInterval(() => void runSync(), SYNC_INTERVAL_MS);
    window.addEventListener(DIRTY_EVENT, onDirty);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(debounce);
      window.clearInterval(interval);
      window.removeEventListener(DIRTY_EVENT, onDirty);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [userId, runSync]);

  const value = useMemo<AccountContextValue>(
    () => ({
      status,
      config,
      user,
      sync,
      dataVersion,
      checkSession,
      signIn: async (email, password) => {
        const client = await loadAuthClient();
        const { data, error } = await client.signIn.email({ email, password });
        if (error) return { ok: false, message: errorMessage(error, "Couldn't sign in.") };
        applySession(data?.user as AccountUser | undefined);
        return { ok: true };
      },
      signUp: async ({ name, email, password, cohort }) => {
        const client = await loadAuthClient();
        const { data, error } = await client.signUp.email({ name, email, password, cohort: cohort || undefined });
        if (error) return { ok: false, message: errorMessage(error, "Couldn't create the account.") };
        applySession(data?.user as AccountUser | undefined);
        return { ok: true };
      },
      signInWithGoogle: async () => {
        const client = await loadAuthClient();
        const { error } = await client.signIn.social({ provider: "google", callbackURL: "/account" });
        return error ? { ok: false, message: errorMessage(error, "Couldn't start Google sign-in.") } : { ok: true };
      },
      signOut: async ({ clearDevice = false } = {}) => {
        // Upload anything not yet synced before letting go of the session.
        if (userRef.current && pendingChangeCount() > 0) await runSync();
        const client = await loadAuthClient();
        await client.signOut();
        clearSyncState();
        if (clearDevice) clearLocalProgress();
        setUser(null);
        setStatus("guest");
        setSync({ phase: "idle", pending: 0 });
        if (clearDevice) setDataVersion((v) => v + 1);
      },
      updateProfile: async ({ name, cohort }) => {
        const client = await loadAuthClient();
        const { error } = await client.updateUser({ name, cohort });
        if (error) return { ok: false, message: errorMessage(error, "Couldn't save your profile.") };
        setUser((u) => (u ? { ...u, name, cohort } : u));
        return { ok: true };
      },
      deleteAccount: async (password) => {
        const client = await loadAuthClient();
        const { error } = await client.deleteUser(password ? { password } : {});
        if (error) return { ok: false, message: errorMessage(error, "Couldn't delete the account.") };
        clearSyncState();
        setUser(null);
        setStatus("guest");
        setSync({ phase: "idle", pending: 0 });
        return { ok: true };
      },
      syncNow: () => runSync(),
    }),
    [status, config, user, sync, dataVersion, checkSession, applySession, runSync],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}
