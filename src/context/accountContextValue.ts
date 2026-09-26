import { createContext } from "react";
import type { AccountConfig, AccountUser } from "../lib/account";

export type AccountStatus = "checking" | "unavailable" | "guest" | "signed-in";

export interface SyncStatus {
  phase: "idle" | "syncing" | "error";
  message?: string;
  lastSyncedAt?: number;
  pending: number;
}

export interface AuthResult {
  ok: boolean;
  message?: string;
}

export interface AccountContextValue {
  status: AccountStatus;
  config: AccountConfig | null;
  user: AccountUser | null;
  sync: SyncStatus;
  /** Bumped when a sign-in merge changed local progress, so pages re-read it. */
  dataVersion: number;
  /** Loads the auth client and checks for a session (the Account page calls this). */
  checkSession: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (input: { name: string; email: string; password: string; cohort?: string }) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: (options?: { clearDevice?: boolean }) => Promise<void>;
  updateProfile: (input: { name: string; cohort: string }) => Promise<AuthResult>;
  deleteAccount: (password?: string) => Promise<AuthResult>;
  syncNow: () => Promise<void>;
}

export const AccountContext = createContext<AccountContextValue | null>(null);
