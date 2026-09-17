import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { flashcardDecks } from "../lib/content";
import { useSpacedRepetition } from "../hooks/useSpacedRepetition";
import { EmptyState } from "../components/EmptyState";

const GRADES = [
  { quality: 0, key: "1", label: "Blackout", hint: "No idea" },
  { quality: 2, key: "2", label: "Hard", hint: "Barely recalled" },
  { quality: 3, key: "3", label: "Okay", hint: "Recalled with effort" },
  { quality: 4, key: "4", label: "Good", hint: "Recalled easily" },
  { quality: 5, key: "5", label: "Easy", hint: "Instant recall" },
];

export function FlashcardStudy() {
  const { subjectId = "" } = useParams();
  const deck = flashcardDecks[subjectId] ?? [];
  const { dueCards, grade, stats, hardestCards } = useSpacedRepetition(subjectId, deck);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [session, setSession] = useState({ reviewed: 0, lapses: 0 });
  const [extraReview, setExtraReview] = useState(false);

  const queue = dueCards.length > 0 ? dueCards : deck;
  const card = queue[index % queue.length];
  const sessionDone = dueCards.length === 0 && !extraReview;

  const handleGrade = (quality: number) => {
    grade(card.id, quality);
    setSession((s) => ({
      reviewed: s.reviewed + 1,
      lapses: s.lapses + (quality < 3 ? 1 : 0),
    }));
    setFlipped(false);
    setIndex((i) => i + 1);
  };

  useEffect(() => {
    if (sessionDone) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) {
        return;
      }
      if (!flipped && (e.code === "Space" || e.key === "Enter")) {
        e.preventDefault();
        setFlipped(true);
        return;
      }
      if (flipped) {
        const matched = GRADES.find((g) => g.key === e.key);
        if (matched) {
          e.preventDefault();
          handleGrade(matched.quality);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, sessionDone, card?.id]);

  if (deck.length === 0) {
    return (
      <section className="page">
        <p>Unknown subject.</p>
        <Link to="/flashcards">Back to flashcards</Link>
      </section>
    );
  }

  return (
    <section className="page">
      <Link to="/flashcards" className="back-link">
        ← All subjects
      </Link>
      <h1>{subjectId}</h1>
      <p className="subtitle">
        {stats.due} due · {stats.mastered}/{stats.total} mastered
      </p>

      {sessionDone ? (
        <div className="flashcard-empty">
          {session.reviewed > 0 ? (
            <div className="session-summary">
              <h2>Session complete</h2>
              <div className="session-stats">
                <div>
                  <strong>{session.reviewed}</strong>
                  <span>reviewed</span>
                </div>
                <div>
                  <strong>{session.reviewed - session.lapses}</strong>
                  <span>recalled</span>
                </div>
                <div>
                  <strong>{session.lapses}</strong>
                  <span>missed</span>
                </div>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setIndex(0);
                  setExtraReview(true);
                  setSession({ reviewed: 0, lapses: 0 });
                }}
              >
                Review anyway
              </button>
            </div>
          ) : (
            <EmptyState title="Nothing due right now">
              You're all caught up on this deck — come back later, or review anyway.
              <br />
              <button
                className="btn empty-state-action"
                onClick={() => {
                  setIndex(0);
                  setExtraReview(true);
                  setSession({ reviewed: 0, lapses: 0 });
                }}
              >
                Review anyway
              </button>
            </EmptyState>
          )}

          {hardestCards.length > 0 && (
            <div className="hardest-cards">
              <h3>Your hardest cards</h3>
              <ul>
                {hardestCards.map((c) => (
                  <li key={c.id}>{c.front}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="flashcard-session">
          <div
            className={flipped ? "flashcard flipped" : "flashcard"}
            onClick={() => setFlipped((f) => !f)}
            role="button"
            tabIndex={0}
            aria-pressed={flipped}
            aria-label={flipped ? "Showing answer, click to show question" : "Showing question, click to reveal answer"}
          >
            <div className="flashcard-inner">
              <div className="flashcard-face flashcard-front">
                <p>{card.front}</p>
                <span className="flashcard-hint">Space to reveal</span>
              </div>
              <div className="flashcard-face flashcard-back">
                <p>{card.back}</p>
                <span className="flashcard-hint">Answer</span>
              </div>
            </div>
          </div>

          {card.tags.length > 0 && (
            <div className="tag-row">
              {card.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {flipped && (
            <div className="grade-row">
              {GRADES.map((g) => (
                <button
                  key={g.quality}
                  className="btn btn-grade"
                  onClick={() => handleGrade(g.quality)}
                  title={`${g.hint} (press ${g.key})`}
                >
                  {g.label}
                  <span className="key-hint">{g.key}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
