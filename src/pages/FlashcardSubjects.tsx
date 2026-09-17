import { Link } from "react-router-dom";
import { flashcardDecks, flashcardSubjects } from "../lib/content";
import { readJSON, STORAGE_KEYS } from "../lib/storage";
import { INITIAL_CARD_STATE, isDue } from "../lib/sm2";
import type { CardStateMap } from "../types/content";

export function FlashcardSubjects() {
  return (
    <section className="page">
      <h1>Flashcards</h1>
      <p className="subtitle">Pick a subject to start a spaced-repetition review session.</p>
      <div className="card-grid">
        {flashcardSubjects.map((subject) => {
          const deck = flashcardDecks[subject.id];
          const stateMap = readJSON<CardStateMap>(
            STORAGE_KEYS.cardState(subject.id),
            {},
          );
          const due = deck.filter((card) =>
            isDue(stateMap[card.id] ?? INITIAL_CARD_STATE),
          ).length;

          return (
            <Link key={subject.id} to={`/flashcards/${subject.id}`} className="nav-card">
              <h2>{subject.label}</h2>
              <p>
                {deck.length} cards · <strong>{due} due</strong>
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
