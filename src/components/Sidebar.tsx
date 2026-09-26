import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { StreakBadge } from "./StreakBadge";
import { QuizDueBadge } from "./QuizDueBadge";
import { PulseLine } from "./PulseLine";
import { OPEN_COMMAND_PALETTE_EVENT } from "./CommandPalette";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { STORAGE_KEYS } from "../lib/storage";
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
  UserIcon,
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
  { to: "/account", label: "Account", icon: <UserIcon /> },
];

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent);

function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
}

const collapseShortcut = isMac ? "⌘\\" : "Ctrl+\\";

export function Sidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Desktop only: shrinks the sidebar to an icon rail. The mobile drawer ignores it.
  const [collapsed, setCollapsed] = useLocalStorage<boolean>(STORAGE_KEYS.sidebarCollapsed, false);
  const navRef = useRef<HTMLElement>(null);
  const hoveredLink = useRef<HTMLElement | null>(null);
  const { pathname } = useLocation();

  // Two glass "lenses" sit behind the links: one marks the current page, the other follows the
  // pointer. Both are positioned from the link boxes through CSS custom properties on the nav,
  // and CSS springs them between links.
  const placeLens = useCallback((name: "active" | "hover", link: Element | null) => {
    const nav = navRef.current;
    if (!nav) return;
    if (!(link instanceof HTMLElement)) {
      nav.style.setProperty(`--${name}-o`, "0");
      return;
    }
    nav.style.setProperty(`--${name}-x`, `${link.offsetLeft}px`);
    nav.style.setProperty(`--${name}-y`, `${link.offsetTop}px`);
    nav.style.setProperty(`--${name}-w`, `${link.offsetWidth}px`);
    nav.style.setProperty(`--${name}-h`, `${link.offsetHeight}px`);
    nav.style.setProperty(`--${name}-o`, "1");
  }, []);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const sync = () => {
      placeLens("active", nav.querySelector(".sidebar-link.active"));
      if (hoveredLink.current) placeLens("hover", hoveredLink.current);
    };
    sync();
    // Only animate once the lenses have a real starting position.
    const frame = requestAnimationFrame(() => nav.setAttribute("data-ready", ""));
    // Keeps the lenses glued to the links while the sidebar collapses or expands.
    const observer = new ResizeObserver(sync);
    observer.observe(nav);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [pathname, placeLens]);

  // While the sidebar itself is resizing, the lenses follow the links frame by frame (via the
  // ResizeObserver) instead of springing, so they never lag behind the narrowing rail.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const nav = navRef.current;
    if (!nav) return;
    nav.setAttribute("data-morphing", "");
    const timer = window.setTimeout(() => nav.removeAttribute("data-morphing"), 700);
    return () => window.clearTimeout(timer);
  }, [collapsed]);

  const onNavPointerMove = (e: PointerEvent<HTMLElement>) => {
    const nav = navRef.current;
    const link = (e.target as HTMLElement).closest(".sidebar-link") as HTMLElement | null;
    if (!nav || !link) return;
    if (link !== hoveredLink.current) {
      // Coming from outside the nav, the lens appears in place instead of sliding in from
      // wherever it was last.
      if (!hoveredLink.current) {
        nav.setAttribute("data-lens-jump", "");
        requestAnimationFrame(() => requestAnimationFrame(() => nav.removeAttribute("data-lens-jump")));
      }
      hoveredLink.current = link;
      placeLens("hover", link);
    }
    const rect = link.getBoundingClientRect();
    nav.style.setProperty("--lens-px", `${e.clientX - rect.left}px`);
    nav.style.setProperty("--lens-py", `${e.clientY - rect.top}px`);
  };

  const onNavPointerLeave = () => {
    hoveredLink.current = null;
    placeLens("hover", null);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setCollapsed]);

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

      <aside
        id="app-sidebar"
        className={["sidebar", drawerOpen && "open", collapsed && "collapsed"].filter(Boolean).join(" ")}
      >
        <div className="sidebar-brand">
          <span className="sidebar-brand-name">
            <PulseLine width={28} height={17} />
            Medicine
          </span>
          <button
            type="button"
            className="icon-btn sidebar-collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            aria-controls="app-sidebar"
            title={`${collapsed ? "Expand" : "Collapse"} sidebar (${collapseShortcut})`}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <rect x="3.5" y="4.5" width="17" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M9.5 4.5v15" stroke="currentColor" strokeWidth="1.6" />
              <path
                d={collapsed ? "M13.5 10l2 2-2 2" : "M16 10l-2 2 2 2"}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <nav
          className="sidebar-nav"
          aria-label="Primary"
          ref={navRef}
          onPointerMove={onNavPointerMove}
          onPointerLeave={onNavPointerLeave}
        >
          <span className="sidebar-lens sidebar-lens-active" aria-hidden="true" />
          <span className="sidebar-lens sidebar-lens-hover" aria-hidden="true" />
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}
              onClick={() => setDrawerOpen(false)}
              title={collapsed ? link.label : undefined}
            >
              <span className="sidebar-link-icon">{link.icon}</span>
              <span className="sidebar-link-label">{link.label}</span>
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
