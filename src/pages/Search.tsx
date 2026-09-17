import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Fuse from "fuse.js";
import { flashcardDecks, quizBanks } from "../lib/content";

interface SearchDoc {
  type: "flashcard" | "quiz";
  subjectId: string;
  id: string;
  title: string;
  detail: string;
}

export function Search() {
  const [query, setQuery] = useState("");

  const docs = useMemo<SearchDoc[]>(() => {
    const flashcardDocs = Object.entries(flashcardDecks).flatMap(
      ([subjectId, cards]) =>
        cards.map((card) => ({
          type: "flashcard" as const,
          subjectId,
          id: card.id,
          title: card.front,
          detail: card.back,
        })),
    );
    const quizDocs = Object.entries(quizBanks).flatMap(([subjectId, bank]) =>
      bank.map((q) => ({
        type: "quiz" as const,
        subjectId,
        id: q.id,
        title: q.question,
        detail: q.explanation,
      })),
    );
    return [...flashcardDocs, ...quizDocs];
  }, []);

  const fuse = useMemo(
    () =>
      new Fuse(docs, {
        keys: ["title", "detail"],
        threshold: 0.35,
      }),
    [docs],
  );

  const results = query.trim()
    ? fuse.search(query).slice(0, 25).map((r) => r.item)
    : [];

  return (
    <section className="page">
      <h1>Search</h1>
      <p className="subtitle">Search across every flashcard and quiz question.</p>
      <input
        className="search-input"
        type="search"
        placeholder="Search flashcards & quizzes..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      <ul className="search-results">
        {results.map((doc) => (
          <li key={`${doc.type}-${doc.id}`} className="search-result">
            <Link
              to={
                doc.type === "flashcard"
                  ? `/flashcards/${doc.subjectId}`
                  : `/quizzes/${doc.subjectId}`
              }
            >
              <span className="search-result-type">{doc.type}</span>
              <p className="search-result-title">{doc.title}</p>
              <p className="search-result-detail">{doc.detail}</p>
            </Link>
          </li>
        ))}
        {query.trim() && results.length === 0 && <p>No results.</p>}
      </ul>
    </section>
  );
}
