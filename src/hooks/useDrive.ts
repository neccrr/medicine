import { useCallback, useEffect, useState } from "react";
import { fetchDrive } from "../lib/drive";
import type { DriveTree } from "../lib/driveTypes";
import { useAccount } from "./useAccount";

export type DriveState =
  /** The site has no class Drive connected (or no accounts at all). */
  | { status: "off" }
  | { status: "signed-out" }
  | { status: "loading" }
  | { status: "ready"; tree: DriveTree; refreshing: boolean }
  | { status: "error"; message: string };

// One listing per page load, shared by every page that shows the Drive.
let cached: { userId: string; tree: DriveTree } | null = null;
let pending: Promise<void> | null = null;
const listeners = new Set<() => void>();
let lastError: string | null = null;

function load(userId: string, refresh = false): Promise<void> {
  pending ??= fetchDrive({ refresh })
    .then((result) => {
      if (result.ok) {
        cached = { userId, tree: result.tree };
        lastError = null;
      } else {
        lastError = result.message;
      }
    })
    .finally(() => {
      pending = null;
      for (const l of listeners) l();
    });
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

  useEffect(() => {
    if (enabled && cached?.userId !== userId && !pending) void load(userId);
  }, [enabled, userId]);

  const refresh = useCallback(() => {
    if (!enabled || pending) return;
    void load(userId, true);
    rerender((n) => n + 1);
  }, [enabled, userId]);

  let state: DriveState;
  if (status === "checking" || (status === "signed-in" && !config)) state = { status: "loading" };
  else if (config?.drive !== true) state = { status: "off" };
  else if (status !== "signed-in") state = { status: "signed-out" };
  else if (cached?.userId === userId) state = { status: "ready", tree: cached.tree, refreshing: pending !== null };
  else if (lastError && !pending) state = { status: "error", message: lastError };
  else state = { status: "loading" };
  return { ...state, refresh };
}
