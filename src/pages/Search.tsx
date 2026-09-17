import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Fuse from "fuse.js";
import { buildContentDocs } from "../lib/searchIndex";
import { EmptyState } from "../components/EmptyState";

export function Search() {
  const [query, setQuery] = useState("");

  const docs = useMemo(() => buildContentDocs(), []);

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
        aria-label="Search flashcards and quizzes"
      />

      {!query.trim() && (
        <EmptyState title="Search across everything">
          Try a symptom, a drug name, or a mechanism — results span every
          flashcard and quiz question in every subject.
        </EmptyState>
      )}

      {query.trim() && results.length === 0 && (
        <EmptyState title={`No matches for "${query}"`}>
          Try a shorter or more general term.
        </EmptyState>
      )}

      <ul className="search-results">
        {results.map((doc) => (
          <li key={`${doc.type}-${doc.id}`} className="search-result">
            <Link to={doc.to}>
              <span className="search-result-type">{doc.type}</span>
              <p className="search-result-title">{doc.title}</p>
              <p className="search-result-detail">{doc.detail}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
