import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { flashcardDecks } from "../lib/content";
import { useSpacedRepetition } from "../hooks/useSpacedRepetition";

const GRADES = [
  { quality: 0, label: "Blackout", hint: "No idea" },
  { quality: 2, label: "Hard", hint: "Barely recalled" },
  { quality: 3, label: "Okay", hint: "Recalled with effort" },
  { quality: 4, label: "Good", hint: "Recalled easily" },
  { quality: 5, label: "Easy", hint: "Instant recall" },
];

export function FlashcardStudy() {
  const { subjectId = "" } = useParams();
  const deck = flashcardDecks[subjectId] ?? [];
  const { dueCards, grade, stats } = useSpacedRepetition(subjectId, deck);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (deck.length === 0) {
    return (
      <section className="page">
        <p>Unknown subject.</p>
        <Link to="/flashcards">Back to flashcards</Link>
      </section>
    );
  }

  const queue = dueCards.length > 0 ? dueCards : deck;
  const card = queue[index % queue.length];
  const sessionDone = dueCards.length === 0;

  const handleGrade = (quality: number) => {
    grade(card.id, quality);
    setFlipped(false);
    setIndex((i) => i + 1);
  };

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
          <p>Nothing due right now — nice work. Come back later, or review anyway.</p>
          <button className="btn" onClick={() => setIndex(0)}>
            Review anyway
          </button>
        </div>
      ) : (
        <div className="flashcard-session">
          <div className="flashcard" onClick={() => setFlipped((f) => !f)}>
            <p className="flashcard-face">{flipped ? card.back : card.front}</p>
            <span className="flashcard-hint">
              {flipped ? "Answer" : "Tap to reveal"}
            </span>
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
                  title={g.hint}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
