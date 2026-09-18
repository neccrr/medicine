import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Fuse from "fuse.js";
import { buildContentDocs } from "../lib/searchIndex";
import { ebookSubjects, flashcardSubjects, quizSubjects, summarySubjects } from "../lib/content";
import { EmptyState } from "../components/EmptyState";

const TYPE_LABELS: Record<string, string> = {
  flashcard: "Flashcards",
  quiz: "Quizzes",
  summary: "Summaries",
  ebook: "Ebooks",
};

function subjectLabel(id: string): string {
  return (
    flashcardSubjects.find((s) => s.id === id)?.label ??
    quizSubjects.find((s) => s.id === id)?.label ??
    ebookSubjects.find((s) => s.id === id)?.label ??
    summarySubjects.find((s) => s.id === id)?.label ??
    id
  );
}

export function Search() {
  const [query, setQuery] = useState("");
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [activeSubjects, setActiveSubjects] = useState<string[]>([]);

  const docs = useMemo(() => buildContentDocs(), []);

  const availableTypes = useMemo(
    () => Array.from(new Set(docs.map((d) => d.type))).sort(),
    [docs],
  );
  const availableSubjects = useMemo(() => {
    const ids = Array.from(new Set(docs.map((d) => d.subjectId).filter((id): id is string => Boolean(id))));
    return ids.sort().map((id) => ({ id, label: subjectLabel(id) }));
  }, [docs]);

  const fuse = useMemo(
    () =>
      new Fuse(docs, {
        keys: [
          { name: "title", weight: 2 },
          { name: "detail", weight: 1 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [docs],
  );

  const toggleType = (type: string) => {
    setActiveTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };
  const toggleSubject = (id: string) => {
    setActiveSubjects((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const rawResults = query.trim() ? fuse.search(query).map((r) => r.item) : [];
  const results = rawResults
    .filter((doc) => activeTypes.length === 0 || activeTypes.includes(doc.type))
    .filter((doc) => activeSubjects.length === 0 || (doc.subjectId && activeSubjects.includes(doc.subjectId)))
    .slice(0, 25);
  const filtersActive = activeTypes.length > 0 || activeSubjects.length > 0;

  return (
    <section className="page">
      <h1>Search</h1>
      <p className="subtitle">Search across every flashcard, quiz question, summary, and ebook chapter.</p>
      <input
        className="search-input"
        type="search"
        placeholder="Search flashcards, quizzes, summaries, ebooks..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
        aria-label="Search all content"
      />

      {query.trim() && (
        <div className="search-filters">
          <div className="tag-filter-row">
            {availableTypes.map((type) => (
              <button
                key={type}
                type="button"
                className={activeTypes.includes(type) ? "tag tag-toggle active" : "tag tag-toggle"}
                onClick={() => toggleType(type)}
                aria-pressed={activeTypes.includes(type)}
              >
                {TYPE_LABELS[type] ?? type}
              </button>
            ))}
          </div>
          <div className="tag-filter-row">
            {availableSubjects.map((s) => (
              <button
                key={s.id}
                type="button"
                className={activeSubjects.includes(s.id) ? "tag tag-toggle active" : "tag tag-toggle"}
                onClick={() => toggleSubject(s.id)}
                aria-pressed={activeSubjects.includes(s.id)}
              >
                {s.label}
              </button>
            ))}
            {filtersActive && (
              <button
                type="button"
                className="tag-filter-clear"
                onClick={() => {
                  setActiveTypes([]);
                  setActiveSubjects([]);
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {!query.trim() && (
        <EmptyState title="Search across everything">
          Try a symptom, a drug name, or a mechanism — results span every
          flashcard, quiz question, summary section, and ebook chapter in
          every subject.
        </EmptyState>
      )}

      {query.trim() && results.length === 0 && (
        <EmptyState title={`No matches for "${query}"`}>
          {filtersActive ? "Try clearing a filter, or use a shorter term." : "Try a shorter or more general term."}
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
