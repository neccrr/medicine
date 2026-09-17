import { Link } from "react-router-dom";
import { tips } from "../lib/content";
import { tipOfDay } from "../lib/tipOfDay";
import { PulseLine } from "../components/PulseLine";

export function Home() {
  const tip = tipOfDay(tips);

  return (
    <section className="page">
      <div className="hero">
        <PulseLine width={640} height={120} className="hero-pulse" />
        <span className="kicker">Offline-first study tool</span>
        <h1 className="hero-title">Study like the data's on a monitor.</h1>
        <p className="subtitle hero-subtitle">
          Flashcards, quizzes, ebooks, and summaries — all static, all local.
          Your progress lives in this browser. No account, no server round-trip.
        </p>
      </div>

      {tip && (
        <div className="tip-card">
          <span className="tip-dot" aria-hidden="true" />
          <div>
            <span className="tip-label">Tip of the day</span>
            <p>{tip}</p>
          </div>
        </div>
      )}

      <div className="card-grid">
        <Link to="/flashcards" className="nav-card">
          <h2>Flashcards</h2>
          <p>Spaced repetition (SM-2) — review what's due, rate your recall.</p>
        </Link>
        <Link to="/quizzes" className="nav-card">
          <h2>Quizzes</h2>
          <p>Multiple-choice question banks with instant scoring and explanations.</p>
        </Link>
        <Link to="/ebooks" className="nav-card">
          <h2>Ebooks</h2>
          <p>Chaptered readers, reference PDFs, and curated links by subject.</p>
        </Link>
        <Link to="/summaries" className="nav-card">
          <h2>Summaries</h2>
          <p>High-yield written summaries by subject.</p>
        </Link>
        <Link to="/search" className="nav-card">
          <h2>Search</h2>
          <p>Find any flashcard or quiz question across every subject.</p>
        </Link>
      </div>
    </section>
  );
}
