import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchDrive, readDriveCache, writeDriveCache, type DriveCache } from "../lib/drive";
import type { DriveTree } from "../lib/driveTypes";
import { storageKey } from "../lib/storageSchema";
import { useAccount } from "./useAccount";
import { useLocalStorage } from "./useLocalStorage";

export type DriveState =
  /** The site has no class Drive connected (or no accounts at all). */
  | { status: "off" }
  | { status: "signed-out" }
  | { status: "loading" }
  /** `problem`: the last check failed, so this is the listing from before. */
  | { status: "ready"; tree: DriveTree; refreshing: boolean; problem: string | null }
  | { status: "error"; message: string };

/** The server is asked again when the page comes back into view after this long. */
const RECHECK_MS = 5 * 60_000;

// One listing per account, shared by every page that shows the Drive: from the device's copy at
// once, then checked with the server (a 304 when nothing changed).
let current: DriveCache | null = null;
let checkedAt = 0;
let pending: Promise<void> | null = null;
let problem: string | null = null;
const listeners = new Set<() => void>();
const notify = () => { for (const l of listeners) l(); };

/** This account's listing: the one in memory, else the device's copy (read once). */
function cacheFor(userId: string): DriveCache | null {
  if (current?.userId !== userId) current = readDriveCache(userId);
  return current;
}

function load(userId: string, refresh = false): Promise<void> {
  cacheFor(userId);
  pending ??= fetchDrive({ refresh, etag: current?.etag })
    .then((result) => {
      if (!result.ok) {
        problem = result.message;
        return;
      }
      problem = null;
      checkedAt = Date.now();
      if ("tree" in result) {
        current = { userId, etag: result.etag, tree: result.tree };
        writeDriveCache(current);
      }
    })
    .finally(() => {
      pending = null;
      notify();
    });
  notify();
  return pending;
}

/** The class Drive's folder tree, for a signed-in student. */
export function useDrive(): DriveState & { refresh: () => void } {
  const { status, config, user } = useAccount();
  const [, rerender] = useState(0);
  const userId = user?.id ?? "";
  const enabled = status === "signed-in" && config?.drive === true;

  useEffect(() => {
    const update = () => { rerender((n) => n + 1); };
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  // Checked once per visit, and again when the page comes back after a while.
  useEffect(() => {
    if (!enabled) return;
    if (current?.userId !== userId || Date.now() - checkedAt > RECHECK_MS) {
      if (!pending) void load(userId);
    }
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - checkedAt > RECHECK_MS && !pending) void load(userId);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, userId]);

  const refresh = useCallback(() => {
    if (enabled && !pending) void load(userId, true);
  }, [enabled, userId]);

  const cache = enabled ? cacheFor(userId) : null;

  let state: DriveState;
  if (status === "checking" || (status === "signed-in" && !config)) state = { status: "loading" };
  else if (config?.drive !== true) state = { status: "off" };
  else if (status !== "signed-in") state = { status: "signed-out" };
  else if (cache) state = { status: "ready", tree: cache.tree, refreshing: pending !== null, problem };
  else if (problem && !pending) state = { status: "error", message: problem };
  else state = { status: "loading" };
  return { ...state, refresh };
}

/** Most file ids kept: far more than a semester's files. */
const OPENED_LIMIT = 3000;

/** Which Drive files this student has opened (synced, so "new" clears on every device). */
export function useDriveOpened(): { opened: ReadonlySet<string>; markOpened: (id: string) => void } {
  const [ids, setIds] = useLocalStorage<string[]>(storageKey("driveseen"), []);
  const opened = useMemo(() => new Set(Array.isArray(ids) ? ids : []), [ids]);
  const markOpened = useCallback(
    (id: string) => {
      setIds((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        return list.includes(id) ? list : [...list, id].slice(-OPENED_LIMIT);
      });
    },
    [setIds],
  );
  return { opened, markOpened };
}
