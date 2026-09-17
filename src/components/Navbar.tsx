import { NavLink } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { StreakBadge } from "./StreakBadge";
import { PulseLine } from "./PulseLine";
import { OPEN_COMMAND_PALETTE_EVENT } from "./CommandPalette";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/flashcards", label: "Flashcards" },
  { to: "/quizzes", label: "Quizzes" },
  { to: "/ebooks", label: "Ebooks" },
  { to: "/summaries", label: "Summaries" },
  { to: "/search", label: "Search" },
  { to: "/progress", label: "Progress" },
];

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent);

export function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-brand">
        <PulseLine width={30} height={18} />
        Medicine
      </div>
      <nav className="navbar-links" aria-label="Primary">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="navbar-actions">
        <StreakBadge />
        <button
          type="button"
          className="icon-btn command-trigger"
          onClick={() => window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT))}
          aria-label="Open command palette"
          title="Search & jump to anything"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" fill="none" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <kbd>{isMac ? "⌘K" : "Ctrl K"}</kbd>
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
