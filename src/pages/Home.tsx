import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ebookMeta,
  ebookSubjects,
  examPackagesByBlock,
  flashcardDecks,
  flashcardSubjects,
  modulesByBlockSubject,
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
import { subjectAccent, subjectHueStyle } from "../lib/subjectStyle";
import { blockIdForSubject, groupByBlock } from "../lib/blocks";
import { PulseLine } from "../components/PulseLine";
import { SubjectBadge } from "../components/SubjectBadge";
import { RadialGauge } from "../components/RadialGauge";
import { useCountUp } from "../hooks/useCountUp";
import { ActivityHeatmap } from "../components/ActivityHeatmap";
import { EmptyState } from "../components/EmptyState";
import { BackupNudge } from "../components/BackupNudge";
import {
  AtomIcon,
  BookIcon,
  CalendarIcon,
  CardsIcon,
  FlameIcon,
  LinkIcon,
  PlayCircleIcon,
  QuizIcon,
  SearchIcon,
  SlidesIcon,
  SummaryIcon,
  TimerIcon,
} from "../components/icons";
import type { CardStateMap, ExamAttempt, QuizAttempt, ReadingPosition } from "../types/content";

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
  icon: ReactNode;
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
      to: `/ebooks/${blockIdForSubject(s.id)}/${s.id}/${position.chapterId}`,
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
        to: `/flashcards/${blockIdForSubject(s.id)}/${s.id}`,
        title: `${due} card${due === 1 ? "" : "s"} due in ${s.label}`,
        detail: "Spaced-repetition review",
        subjectId: s.id,
        subjectLabel: s.label,
      });
    });

  const dueQuizSubjectIds = new Set<string>();
  quizSubjects
    .map((s) => ({
      s,
      due: readJSON<string[]>(STORAGE_KEYS.quizDue(s.id), []).length,
    }))
    .filter((x) => x.due > 0)
    .sort((a, b) => b.due - a.due)
    .slice(0, 2)
    .forEach(({ s, due }) => {
      dueQuizSubjectIds.add(s.id);
      items.push({
        to: `/quizzes/${blockIdForSubject(s.id)}/${s.id}`,
        title: `${due} quiz question${due === 1 ? "" : "s"} due in ${s.label}`,
        detail: "Missed in a past attempt",
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
    .filter((x): x is NonNullable<typeof x> => x !== null && !dueQuizSubjectIds.has(x.s.id))
    .sort((a, b) => b.last.date.localeCompare(a.last.date))
    .slice(0, 2)
    .forEach(({ s, last }) => {
      items.push({
        to: `/quizzes/${blockIdForSubject(s.id)}/${s.id}`,
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
      let activityScore = 0;
      let mastery: number | null = null;

      const blockId = blockIdForSubject(id);

      const deck = flashcardDecks[id];
      if (deck) {
        const stateMap = readJSON<CardStateMap>(STORAGE_KEYS.cardState(id), {});
        const due = deck.filter((c) => isDue(stateMap[c.id] ?? INITIAL_CARD_STATE)).length;
        const masteredCount = deck.filter((c) => (stateMap[c.id]?.interval ?? 0) >= 21).length;
        mastery = deck.length > 0 ? (masteredCount / deck.length) * 100 : 0;
        activityScore += due;
        facets.push({
          label: "Flashcards",
          detail: due > 0 ? `${deck.length} · ${due} due` : `${deck.length} cards`,
          to: `/flashcards/${blockId}/${id}`,
          icon: <CardsIcon />,
        });
      }

      const bank = quizBanks[id];
      const games = quizGames[id];
      if (bank || games) {
        const history = readJSON<QuizAttempt[]>(STORAGE_KEYS.quizProgress(id), []);
        const last = history[history.length - 1];
        const due = readJSON<string[]>(STORAGE_KEYS.quizDue(id), []).length;
        activityScore += due;
        facets.push({
          label: "Quiz",
          detail: bank
            ? due > 0
              ? `${bank.length} · ${due} due`
              : last
                ? `${bank.length} · last ${last.score}/${last.total}`
                : `${bank.length} questions`
            : "Interactive",
          to: `/quizzes/${blockId}/${id}`,
          icon: <QuizIcon />,
        });
      }

      const meta = ebookMeta[id];
      if (meta) {
        const completedCount = readJSON<string[]>(STORAGE_KEYS.ebookCompleted(id), []).length;
        facets.push({
          label: "Ebook",
          detail:
            meta.chapters.length > 0
              ? completedCount > 0
                ? `${completedCount}/${meta.chapters.length} complete`
                : `${meta.chapters.length} chapters`
              : "Reference PDF",
          to: `/ebooks/${blockId}/${id}`,
          icon: <BookIcon />,
        });
      }

      if (summaries[id]) {
        facets.push({
          label: "Summary",
          detail: "Written summary",
          to: `/summaries/${blockId}/${id}`,
          icon: <SummaryIcon />,
        });
      }

      const modulePdfs = blockId ? modulesByBlockSubject[`${blockId}/${id}`] : undefined;
      if (blockId && modulePdfs) {
        facets.push({
          label: "Modules",
          detail: `${modulePdfs.length} lecture${modulePdfs.length === 1 ? "" : "s"}`,
          to: `/modules/${blockId}/${id}`,
          icon: <SlidesIcon />,
        });
      }

      return { id, label, facets, activityScore, mastery };
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
  const featuredId =
    subjects.length > 1
      ? subjects.reduce((top, s) => (s.activityScore > top.activityScore ? s : top), subjects[0]).id
      : null;

  const heroTitle = streak > 0
    ? `${streak}-day streak. Keep it going.`
    : hasActivity
      ? "Welcome back."
      : "Study like the data's on a monitor.";

  const streakCount = useCountUp(streak);
  const dueCount = useCountUp(totalDue);
  const studyDaysCount = useCountUp(activityDays.length);
  const quizAttemptsCount = useCountUp(totalQuizAttempts);

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

      <BackupNudge />

      <div className="streak-stats dashboard-stats">
        <div className="stat-tile">
          <span className="stat-tile-icon"><FlameIcon /></span>
          <span className="stat-label">Streak</span>
          <span className="stat-value">{streakCount}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-icon"><CardsIcon /></span>
          <span className="stat-label">Cards due</span>
          <span className="stat-value">{dueCount}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-icon"><CalendarIcon /></span>
          <span className="stat-label">Study days</span>
          <span className="stat-value">{studyDaysCount}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-icon"><QuizIcon /></span>
          <span className="stat-label">Quiz attempts</span>
          <span className="stat-value">{quizAttemptsCount}</span>
        </div>
      </div>

      <hr className="section-divider" />

      <div className="dashboard-layout">
        <div className="dashboard-main">
          <div className="dashboard-section">
            <h2 className="section-heading">
              <PlayCircleIcon />
              Continue
            </h2>
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

          {groupByBlock(subjects).map(({ block, subjects: blockSubjects, upcoming }) => {
            const packages = examPackagesByBlock[block.id] ?? [];
            const examPool =
              packages.length > 0
                ? Math.max(...packages.map((p) => p.questions.length))
                : block.subjectIds.reduce((sum, id) => sum + (quizBanks[id]?.length ?? 0), 0);
            // With more than one package, "last score" isn't a single number — the exam link
            // just sends the user to the picker instead of surfacing one package's history.
            // (Matches ExamPlay's own key convention: a lone package keeps the plain block key.)
            const examHistory =
              packages.length > 1 ? [] : readJSON<ExamAttempt[]>(STORAGE_KEYS.examHistory(block.id), []);
            const lastExam = examHistory[examHistory.length - 1];
            return (
          <div key={block.id} className="dashboard-section block-section">
            <div className="block-section-head">
              <h2 className="section-heading">
                <AtomIcon />
                {block.label}
              </h2>
              {examPool > 0 && (
                <Link to={`/exam/${block.id}`} className="block-exam-link">
                  <TimerIcon />
                  {lastExam ? `Exam · last ${lastExam.score}/${lastExam.total}` : "Take the exam"}
                </Link>
              )}
            </div>
            <div className="subject-grid">
              {blockSubjects.map((subject) => (
                <div
                  key={subject.id}
                  className={
                    subject.id === featuredId
                      ? "subject-card subject-card-featured subject-tinted"
                      : "subject-card subject-tinted"
                  }
                  style={
                    {
                      borderLeftColor: subjectAccent(subject.id),
                      "--subject-glow": subjectAccent(subject.id),
                      ...subjectHueStyle(subject.id),
                    } as CSSProperties
                  }
                >
                  <div className="subject-card-head">
                    <SubjectBadge id={subject.id} label={subject.label} />
                    <h3>{subject.label}</h3>
                    {subject.mastery !== null && (
                      <RadialGauge
                        percent={subject.mastery}
                        label={`${Math.round(subject.mastery)}% of ${subject.label} flashcards mastered`}
                      />
                    )}
                  </div>
                  <div className="subject-links">
                    {subject.facets.map((facet) => (
                      <Link
                        key={facet.to + facet.label}
                        to={facet.to}
                        className={`subject-pill subject-pill-${facet.label.toLowerCase()}`}
                      >
                        <span className="subject-pill-icon">{facet.icon}</span>
                        <span className="subject-pill-text">
                          <span className="subject-pill-label">{facet.label}</span>
                          <span className="subject-pill-detail">{facet.detail}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              {upcoming.map((u) => (
                <div
                  key={u.id}
                  className="subject-card subject-card-upcoming subject-tinted"
                  style={subjectHueStyle(u.id) as CSSProperties}
                >
                  <div className="subject-card-head">
                    <SubjectBadge id={u.id} label={u.label} />
                    <h3>{u.label}</h3>
                  </div>
                  <p className="subject-card-upcoming-note">Content coming soon.</p>
                </div>
              ))}
            </div>
          </div>
            );
          })}
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
            <h2 className="section-heading">
              <CalendarIcon />
              Activity
            </h2>
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
            <h2 className="section-heading">
              <LinkIcon />
              Quick links
            </h2>
            <nav className="quick-links">
              <Link to="/search">
                <span className="quick-links-label">
                  <SearchIcon />
                  Search
                </span>
                <kbd>⌘K</kbd>
              </Link>
              <Link to="/ebooks">
                <span className="quick-links-label">
                  <BookIcon />
                  Ebooks
                </span>
              </Link>
              <Link to="/summaries">
                <span className="quick-links-label">
                  <SummaryIcon />
                  Summaries
                </span>
              </Link>
            </nav>
          </div>
        </aside>
      </div>
    </section>
  );
}
