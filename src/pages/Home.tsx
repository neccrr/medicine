import { Link } from "react-router-dom";
import {
  ebookMeta,
  ebookSubjects,
  flashcardDecks,
  flashcardSubjects,
  quizBanks,
  quizGames,
  quizSubjects,
  summaries,
  summarySubjects,
  tips,
} from "../lib/content";
import { tipOfDay } from "../lib/tipOfDay";
import { getActivityDays, getCurrentStreak, getLongestStreak } from "../lib/activity";
import { readJSON, STORAGE_KEYS } from "../lib/storage";
import { INITIAL_CARD_STATE, isDue } from "../lib/sm2";
import { PulseLine } from "../components/PulseLine";
import { SubjectBadge } from "../components/SubjectBadge";
import { ActivityHeatmap } from "../components/ActivityHeatmap";
import { EmptyState } from "../components/EmptyState";
import type { CardStateMap, QuizAttempt, ReadingPosition } from "../types/content";

interface ContinueItem {
  to: string;
  title: string;
  detail: string;
  subjectId: string;
  subjectLabel: string;
}

interface SubjectFacet {
  label: string;
  detail: string;
  to: string;
}

function buildContinueItems(): ContinueItem[] {
  const items: ContinueItem[] = [];

  const resumes = ebookSubjects
    .map((s) => {
      const meta = ebookMeta[s.id];
      const position = readJSON<ReadingPosition | null>(STORAGE_KEYS.ebookPosition(s.id), null);
      return position ? { s, meta, position } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.position.updatedAt.localeCompare(a.position.updatedAt));

  if (resumes[0]) {
    const { s, meta, position } = resumes[0];
    const chapter = meta.chapters.find((c) => c.id === position.chapterId);
    items.push({
      to: `/ebooks/${s.id}/${position.chapterId}`,
      title: `Continue "${meta.title}"`,
      detail: chapter ? chapter.title : "Resume reading",
      subjectId: s.id,
      subjectLabel: s.label,
    });
  }

  flashcardSubjects
    .map((s) => {
      const deck = flashcardDecks[s.id];
      const stateMap = readJSON<CardStateMap>(STORAGE_KEYS.cardState(s.id), {});
      const due = deck.filter((c) => isDue(stateMap[c.id] ?? INITIAL_CARD_STATE)).length;
      return { s, due };
    })
    .filter((x) => x.due > 0)
    .sort((a, b) => b.due - a.due)
    .slice(0, 2)
    .forEach(({ s, due }) => {
      items.push({
        to: `/flashcards/${s.id}`,
        title: `${due} card${due === 1 ? "" : "s"} due in ${s.label}`,
        detail: "Spaced-repetition review",
        subjectId: s.id,
        subjectLabel: s.label,
      });
    });

  quizSubjects
    .map((s) => {
      const history = readJSON<QuizAttempt[]>(STORAGE_KEYS.quizProgress(s.id), []);
      const last = history[history.length - 1];
      return last ? { s, last } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.last.date.localeCompare(a.last.date))
    .slice(0, 2)
    .forEach(({ s, last }) => {
      items.push({
        to: `/quizzes/${s.id}`,
        title: `Retake ${s.label} quiz`,
        detail: `Last score ${last.score}/${last.total}`,
        subjectId: s.id,
        subjectLabel: s.label,
      });
    });

  return items.slice(0, 4);
}

function buildSubjectOverviews() {
  const ids = new Set<string>();
  flashcardSubjects.forEach((s) => ids.add(s.id));
  quizSubjects.forEach((s) => ids.add(s.id));
  ebookSubjects.forEach((s) => ids.add(s.id));
  summarySubjects.forEach((s) => ids.add(s.id));

  return Array.from(ids)
    .sort()
    .map((id) => {
      const label =
        flashcardSubjects.find((s) => s.id === id)?.label ??
        quizSubjects.find((s) => s.id === id)?.label ??
        ebookSubjects.find((s) => s.id === id)?.label ??
        summarySubjects.find((s) => s.id === id)?.label ??
        id;

      const facets: SubjectFacet[] = [];

      const deck = flashcardDecks[id];
      if (deck) {
        const stateMap = readJSON<CardStateMap>(STORAGE_KEYS.cardState(id), {});
        const due = deck.filter((c) => isDue(stateMap[c.id] ?? INITIAL_CARD_STATE)).length;
        facets.push({
          label: "Flashcards",
          detail: due > 0 ? `${deck.length} · ${due} due` : `${deck.length} cards`,
          to: `/flashcards/${id}`,
        });
      }

      const bank = quizBanks[id];
      const games = quizGames[id];
      if (bank || games) {
        const history = readJSON<QuizAttempt[]>(STORAGE_KEYS.quizProgress(id), []);
        const last = history[history.length - 1];
        facets.push({
          label: "Quiz",
          detail: bank
            ? last
              ? `${bank.length} · last ${last.score}/${last.total}`
              : `${bank.length} questions`
            : "Interactive",
          to: `/quizzes/${id}`,
        });
      }

      const meta = ebookMeta[id];
      if (meta) {
        facets.push({
          label: "Ebook",
          detail: meta.chapters.length > 0 ? `${meta.chapters.length} chapters` : "Reference PDF",
          to: `/ebooks/${id}`,
        });
      }

      if (summaries[id]) {
        facets.push({ label: "Summary", detail: "Written summary", to: `/summaries/${id}` });
      }

      return { id, label, facets };
    });
}

export function Home() {
  const tip = tipOfDay(tips);
  const activityDays = getActivityDays();
  const streak = getCurrentStreak(activityDays);
  const longest = getLongestStreak(activityDays);
  const hasActivity = activityDays.length > 0;

  const totalDue = flashcardSubjects.reduce((sum, s) => {
    const deck = flashcardDecks[s.id];
    const stateMap = readJSON<CardStateMap>(STORAGE_KEYS.cardState(s.id), {});
    return sum + deck.filter((c) => isDue(stateMap[c.id] ?? INITIAL_CARD_STATE)).length;
  }, 0);

  const totalQuizAttempts = quizSubjects.reduce(
    (sum, s) => sum + readJSON<QuizAttempt[]>(STORAGE_KEYS.quizProgress(s.id), []).length,
    0,
  );

  const continueItems = buildContinueItems();
  const subjects = buildSubjectOverviews();

  const heroTitle = streak > 0
    ? `${streak}-day streak. Keep it going.`
    : hasActivity
      ? "Welcome back."
      : "Study like the data's on a monitor.";

  return (
    <section className="page dashboard">
      <div className="hero">
        <PulseLine width={640} height={120} className="hero-pulse" />
        <span className="kicker">Offline-first study tool</span>
        <h1 className="hero-title">{heroTitle}</h1>
        <p className="subtitle hero-subtitle">
          Flashcards, quizzes, ebooks, and summaries — all static, all local.
          Your progress lives in this browser. No account, no server round-trip.
        </p>
      </div>

      <div className="streak-stats dashboard-stats">
        <div className="stat-tile">
          <span className="stat-label">Streak</span>
          <span className="stat-value">{streak}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Cards due</span>
          <span className="stat-value">{totalDue}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Study days</span>
          <span className="stat-value">{activityDays.length}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Quiz attempts</span>
          <span className="stat-value">{totalQuizAttempts}</span>
        </div>
      </div>

      <div className="dashboard-layout">
        <div className="dashboard-main">
          <div className="dashboard-section">
            <h2 className="section-heading">Continue</h2>
            {continueItems.length > 0 ? (
              <div className="continue-list">
                {continueItems.map((item) => (
                  <Link key={item.to} to={item.to} className="continue-item">
                    <SubjectBadge id={item.subjectId} label={item.subjectLabel} />
                    <span className="continue-item-body">
                      <span className="continue-item-title">{item.title}</span>
                      <span className="continue-item-detail">{item.detail}</span>
                    </span>
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="continue-item-chevron">
                      <path
                        d="M9 6l6 6-6 6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="Nothing in progress yet">
                <Link to="/flashcards" className="btn empty-state-action">
                  Start a study session
                </Link>
              </EmptyState>
            )}
          </div>

          <div className="dashboard-section">
            <h2 className="section-heading">Subjects</h2>
            <div className="subject-grid">
              {subjects.map((subject) => (
                <div key={subject.id} className="subject-card">
                  <div className="subject-card-head">
                    <SubjectBadge id={subject.id} label={subject.label} />
                    <h3>{subject.label}</h3>
                  </div>
                  <div className="subject-links">
                    {subject.facets.map((facet) => (
                      <Link key={facet.to + facet.label} to={facet.to} className="subject-pill">
                        <span className="subject-pill-label">{facet.label}</span>
                        <span className="subject-pill-detail">{facet.detail}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="dashboard-aside">
          {tip && (
            <div className="tip-card">
              <span className="tip-dot" aria-hidden="true" />
              <div>
                <span className="tip-label">Tip of the day</span>
                <p>{tip}</p>
              </div>
            </div>
          )}

          <div className="dashboard-widget">
            <h2 className="section-heading">Activity</h2>
            <div className="mini-stats">
              <div>
                <span className="stat-value">{streak}</span>
                <span className="stat-label">Current</span>
              </div>
              <div>
                <span className="stat-value">{longest}</span>
                <span className="stat-label">Longest</span>
              </div>
            </div>
            {hasActivity && (
              <div className="heatmap-wrapper mini-heatmap">
                <ActivityHeatmap days={activityDays} weeks={10} />
              </div>
            )}
            <Link to="/progress" className="widget-link">
              Full progress →
            </Link>
          </div>

          <div className="dashboard-widget">
            <h2 className="section-heading">Quick links</h2>
            <nav className="quick-links">
              <Link to="/search">
                Search
                <kbd>⌘K</kbd>
              </Link>
              <Link to="/ebooks">Ebooks</Link>
              <Link to="/summaries">Summaries</Link>
            </nav>
          </div>
        </aside>
      </div>
    </section>
  );
}
