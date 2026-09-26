import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "../hooks/useAccount";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { studyBlocks } from "../lib/blocks";
import { STORAGE_KEYS } from "../lib/storage";

function timeAgo(ms: number | undefined): string {
  if (!ms) return "not yet";
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 45) return "just now";
  if (s < 90) return "a minute ago";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minutes ago`;
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? "an hour ago" : `${h} hours ago`;
  return new Date(ms).toLocaleDateString();
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("") || "?"
  );
}

/** The block the student is currently in. Works for guests too; synced for accounts. */
function CurrentBlockPicker() {
  const [currentBlock, setCurrentBlock] = useLocalStorage<string>(STORAGE_KEYS.currentBlock, "");
  return (
    <label className="account-field">
      <span>Current block</span>
      <select className="form-select" value={currentBlock} onChange={(e) => setCurrentBlock(e.target.value)}>
        <option value="">Show all blocks equally</option>
        {studyBlocks.map((b) => (
          <option key={b.id} value={b.id}>
            {b.label}
          </option>
        ))}
      </select>
      <small>Home shows this block first.</small>
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.87h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.9-1.75 2.99-4.33 2.99-7.34z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.43l-3.23-2.5c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.76-5.59-4.12H3.08v2.58A9.99 9.99 0 0 0 12 22z" />
      <path fill="#FBBC05" d="M6.41 13.9A6 6 0 0 1 6.1 12c0-.66.11-1.3.31-1.9V7.52H3.08A9.99 9.99 0 0 0 2 12c0 1.61.39 3.14 1.08 4.48l3.33-2.58z" />
      <path fill="#EA4335" d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.86-2.86C16.96 3 14.7 2 12 2a9.99 9.99 0 0 0-8.92 5.52l3.33 2.58C7.2 7.74 9.4 5.98 12 5.98z" />
    </svg>
  );
}

function SignInPanel() {
  const { config, signIn, signUp, signInWithGoogle } = useAccount();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cohort, setCohort] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const result =
      mode === "sign-in" ? await signIn(email.trim(), password) : await signUp({ name: name.trim(), email: email.trim(), password, cohort: cohort.trim() });
    setBusy(false);
    if (!result.ok) setMessage(result.message ?? "Something went wrong.");
  };

  return (
    <div className="account-card account-auth">
      <div className="account-tabs" role="tablist" aria-label="Sign in or create an account">
        {(["sign-in", "sign-up"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={mode === m ? "account-tab active" : "account-tab"}
            onClick={() => {
              setMode(m);
              setMessage("");
            }}
          >
            {m === "sign-in" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form className="account-form" onSubmit={submit}>
        {mode === "sign-up" && (
          <label className="account-field">
            <span>Name</span>
            <input className="form-input" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label className="account-field">
          <span>Email</span>
          <input className="form-input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="account-field">
          <span>Password</span>
          <input
            className="form-input"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "sign-up" && <small>At least 8 characters.</small>}
        </label>
        {mode === "sign-up" && (
          <label className="account-field">
            <span>
              Cohort <em>(optional)</em>
            </span>
            <input className="form-input" inputMode="numeric" placeholder="e.g. 2025" maxLength={20} value={cohort} onChange={(e) => setCohort(e.target.value)} />
            <small>Your entry year, used later to compare scores within your class.</small>
          </label>
        )}
        {message && (
          <p className="account-error" role="alert">
            {message}
          </p>
        )}
        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>

      {config?.google && (
        <>
          <div className="account-divider">
            <span>or</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary account-google"
            onClick={async () => {
              const r = await signInWithGoogle();
              if (!r.ok) setMessage(r.message ?? "");
            }}
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </>
      )}
    </div>
  );
}

function SignedInView() {
  const { user, sync, syncNow, updateProfile, signOut, deleteAccount } = useAccount();
  const [name, setName] = useState(user?.name ?? "");
  const [cohort, setCohort] = useState(user?.cohort ?? "");
  const [profileMessage, setProfileMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [, tick] = useState(0);

  // Keep "synced 2 minutes ago" fresh.
  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);

  if (!user) return null;

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    const r = await updateProfile({ name: name.trim(), cohort: cohort.trim() });
    setSavingProfile(false);
    setProfileMessage(r.ok ? "Saved." : (r.message ?? "Couldn't save."));
  };

  const downloadData = async () => {
    const res = await fetch("/api/account/export", { credentials: "same-origin" });
    if (!res.ok) return;
    const blob = new Blob([await res.text()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medicine-account-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const syncLine =
    sync.phase === "syncing"
      ? "Syncing…"
      : sync.phase === "error"
        ? sync.message
        : `Synced ${timeAgo(sync.lastSyncedAt)}`;

  return (
    <div className="account-grid">
      <div className="account-card account-profile">
        <div className="account-profile-head">
          <span className="account-avatar" aria-hidden="true">
            {initials(user.name)}
          </span>
          <div>
            <p className="account-name">{user.name}</p>
            <p className="account-email">{user.email}</p>
          </div>
        </div>
        <form className="account-form" onSubmit={saveProfile}>
          <label className="account-field">
            <span>Name</span>
            <input className="form-input" required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="account-field">
            <span>Cohort</span>
            <input className="form-input" placeholder="e.g. 2025" maxLength={20} value={cohort} onChange={(e) => setCohort(e.target.value)} />
          </label>
          <div className="account-row">
            <button type="submit" className="btn btn-small" disabled={savingProfile}>
              Save profile
            </button>
            {profileMessage && <span className="account-note">{profileMessage}</span>}
          </div>
        </form>
        <CurrentBlockPicker />
      </div>

      <div className="account-card">
        <h2>Sync</h2>
        <p className={sync.phase === "error" ? "account-sync account-sync-error" : "account-sync"}>
          <span className={`account-sync-dot account-sync-${sync.phase}`} aria-hidden="true" />
          {syncLine}
        </p>
        <p className="account-note">
          Flashcard reviews, quiz and exam history, reading progress, streak days and settings sync
          across every device you sign in on. {sync.pending > 0 && `${sync.pending} change${sync.pending === 1 ? "" : "s"} waiting to upload.`}
        </p>
        <button type="button" className="btn btn-secondary btn-small" onClick={() => void syncNow()} disabled={sync.phase === "syncing"}>
          Sync now
        </button>
      </div>

      <div className="account-card">
        <h2>This device</h2>
        <p className="account-note">Signing out keeps your progress on this device, so you can keep studying as a guest.</p>
        <div className="account-row">
          <button type="button" className="btn btn-secondary btn-small" onClick={() => void signOut()}>
            Sign out
          </button>
          {confirmClear ? (
            <>
              <button type="button" className="btn btn-small account-danger" onClick={() => void signOut({ clearDevice: true })}>
                Yes, sign out and clear
              </button>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-secondary btn-small" onClick={() => setConfirmClear(true)}>
              Sign out and clear this device
            </button>
          )}
        </div>
        {confirmClear && (
          <p className="account-note">Use this on a shared computer. Your progress stays safe in your account.</p>
        )}
      </div>

      <div className="account-card">
        <h2>Your data</h2>
        <p className="account-note">Download everything stored in your account as a JSON file.</p>
        <button type="button" className="btn btn-secondary btn-small" onClick={() => void downloadData()}>
          Download my data
        </button>
        <details className="account-delete">
          <summary>Delete account</summary>
          <p className="account-note">
            This permanently deletes your account and the progress stored on the server. Progress on
            this device stays until you clear it.
          </p>
          <form
            className="account-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await deleteAccount(deletePassword || undefined);
              setDeleteMessage(r.ok ? "" : (r.message ?? "Couldn't delete the account."));
            }}
          >
            <label className="account-field">
              <span>Password</span>
              <input
                className="form-input"
                type="password"
                autoComplete="current-password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
              <small>Leave empty if you signed in with Google.</small>
            </label>
            <label className="account-field">
              <span>Type DELETE to confirm</span>
              <input className="form-input" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} />
            </label>
            {deleteMessage && (
              <p className="account-error" role="alert">
                {deleteMessage}
              </p>
            )}
            <button type="submit" className="btn btn-small account-danger" disabled={deleteConfirm !== "DELETE"}>
              Delete my account
            </button>
          </form>
        </details>
      </div>
    </div>
  );
}

export function Account() {
  const { status, config, checkSession } = useAccount();

  // Coming back from Google sign-in, or a guest opening this page: look for a session.
  useEffect(() => {
    if (status === "guest" && config?.accounts) void checkSession();
    // Only on mount; status changes are driven by the provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="page account-page">
      <h1>Account</h1>
      {status === "checking" && <p className="subtitle">Checking…</p>}

      {status === "unavailable" && (
        <>
          <p className="subtitle">You're studying as a guest.</p>
          <div className="account-card">
            <p>
              Accounts aren't set up on this site, so your progress stays in this browser. Back it up
              from <Link to="/progress">Progress</Link> to move it to another device.
            </p>
            <CurrentBlockPicker />
          </div>
        </>
      )}

      {status === "guest" && (
        <>
          <p className="subtitle">
            You're studying as a guest. Sign in to sync your progress across devices; everything
            you've done on this device comes with you.
          </p>
          <div className="account-grid account-grid-guest">
            <SignInPanel />
            <div className="account-card account-why">
              <h2>Why sign in?</h2>
              <ul>
                <li>
                  <strong>Pick up anywhere.</strong> Flashcard reviews, quiz history, reading
                  progress and your streak follow you between phone and laptop.
                </li>
                <li>
                  <strong>Nothing is lost.</strong> Your guest progress is merged into your account
                  the first time you sign in.
                </li>
                <li>
                  <strong>No more manual backups.</strong> Your progress is saved to your account
                  automatically.
                </li>
                <li>
                  <strong>Still works offline.</strong> Changes sync when you're back online.
                </li>
              </ul>
              <CurrentBlockPicker />
            </div>
          </div>
        </>
      )}

      {status === "signed-in" && (
        <>
          <p className="subtitle">Your progress syncs automatically across your devices.</p>
          <SignedInView />
        </>
      )}
    </section>
  );
}
