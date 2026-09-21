import { useEffect, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { StreakBadge } from "./StreakBadge";
import { QuizDueBadge } from "./QuizDueBadge";
import { PulseLine } from "./PulseLine";
import { OPEN_COMMAND_PALETTE_EVENT } from "./CommandPalette";
import {
  BookIcon,
  CardsIcon,
  HomeIcon,
  ProgressIcon,
  QuizIcon,
  SearchIcon,
  SlidesIcon,
  SummaryIcon,
  TimerIcon,
} from "./icons";

const links: { to: string; label: string; end?: boolean; icon: ReactNode }[] = [
  { to: "/", label: "Home", end: true, icon: <HomeIcon /> },
  { to: "/flashcards", label: "Flashcards", icon: <CardsIcon /> },
  { to: "/quizzes", label: "Quizzes", icon: <QuizIcon /> },
  { to: "/exam", label: "Exam", icon: <TimerIcon /> },
  { to: "/modules", label: "Modules", icon: <SlidesIcon /> },
  { to: "/ebooks", label: "Ebooks", icon: <BookIcon /> },
  { to: "/summaries", label: "Summaries", icon: <SummaryIcon /> },
  { to: "/search", label: "Search", icon: <SearchIcon /> },
  { to: "/progress", label: "Progress", icon: <ProgressIcon /> },
];

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent);

function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
}

export function Sidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  return (
    <>
      <header className="topbar">
        <div className="topbar-row">
          <button
            type="button"
            className="icon-btn sidebar-toggle"
            onClick={() => setDrawerOpen((o) => !o)}
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            aria-expanded={drawerOpen}
            aria-controls="app-sidebar"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              {drawerOpen ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>

          <div className="topbar-brand">
            <PulseLine width={24} height={14} />
            Medicine
          </div>

          <div className="topbar-actions">
            <StreakBadge />
            <QuizDueBadge />
            <button
              type="button"
              className="icon-btn"
              onClick={openCommandPalette}
              aria-label="Open command palette"
              title="Search & jump to anything"
            >
              <SearchIcon />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {drawerOpen && (
        <div className="sidebar-backdrop" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
      )}

      <aside id="app-sidebar" className={drawerOpen ? "sidebar open" : "sidebar"}>
        <div className="sidebar-brand">
          <PulseLine width={28} height={17} />
          Medicine
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}
              onClick={() => setDrawerOpen(false)}
            >
              <span className="sidebar-link-icon">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-badges">
            <StreakBadge />
            <QuizDueBadge />
          </div>
          <div className="sidebar-footer-actions">
            <button
              type="button"
              className="icon-btn command-trigger"
              onClick={openCommandPalette}
              aria-label="Open command palette"
              title="Search & jump to anything"
            >
              <SearchIcon />
              <kbd>{isMac ? "⌘K" : "Ctrl K"}</kbd>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </aside>
    </>
  );
}
