import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { marked } from "marked";
import { ebookChapters, ebookMeta } from "../lib/content";
import { readJSON, writeJSON, STORAGE_KEYS } from "../lib/storage";
import { recordActivity } from "../lib/activity";
import type { ReadingPosition } from "../types/content";

export function EbookReader() {
  const { subjectId = "", chapterId } = useParams();
  const meta = ebookMeta[subjectId];

  const position = readJSON<ReadingPosition | null>(
    STORAGE_KEYS.ebookPosition(subjectId),
    null,
  );

  useEffect(() => {
    if (!meta || !chapterId) return;
    writeJSON<ReadingPosition>(STORAGE_KEYS.ebookPosition(subjectId), {
      chapterId,
      scroll: 0,
      updatedAt: new Date().toISOString(),
    });
    recordActivity();
    window.scrollTo({ top: 0 });
  }, [subjectId, chapterId, meta]);

  if (!meta) {
    return (
      <section className="page">
        <p>Unknown ebook.</p>
        <Link to="/ebooks">Back to ebooks</Link>
      </section>
    );
  }

  if (!chapterId) {
    const resumeChapter = position?.chapterId ?? meta.chapters[0]?.id;
    return <Navigate to={`/ebooks/${subjectId}/${resumeChapter}`} replace />;
  }

  const chapterIndex = meta.chapters.findIndex((c) => c.id === chapterId);
  const chapter = meta.chapters[chapterIndex];
  const markdown = ebookChapters[`${subjectId}/${chapterId}`];
  const prevChapter = meta.chapters[chapterIndex - 1];
  const nextChapter = meta.chapters[chapterIndex + 1];

  if (!chapter || !markdown) {
    return (
      <section className="page">
        <p>Unknown chapter.</p>
        <Link to="/ebooks">Back to ebooks</Link>
      </section>
    );
  }

  return (
    <section className="page ebook-page">
      <Link to="/ebooks" className="back-link">
        ← All ebooks
      </Link>
      <div className="ebook-layout">
        <nav className="ebook-toc" aria-label="Chapters">
          <h2 className="ebook-toc-title">{meta.title}</h2>
          <ol>
            {meta.chapters.map((c, i) => (
              <li key={c.id}>
                <Link
                  to={`/ebooks/${subjectId}/${c.id}`}
                  className={c.id === chapterId ? "ebook-toc-link active" : "ebook-toc-link"}
                  aria-current={c.id === chapterId ? "page" : undefined}
                >
                  {i + 1}. {c.title}
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <div className="ebook-content">
          <div
            className="summary-content"
            dangerouslySetInnerHTML={{ __html: marked.parse(markdown, { async: false }) }}
          />

          <div className="ebook-nav">
            {prevChapter ? (
              <Link
                to={`/ebooks/${subjectId}/${prevChapter.id}`}
                className="btn btn-secondary"
              >
                ← {prevChapter.title}
              </Link>
            ) : (
              <span />
            )}
            {nextChapter ? (
              <Link to={`/ebooks/${subjectId}/${nextChapter.id}`} className="btn">
                {nextChapter.title} →
              </Link>
            ) : (
              <span className="ebook-done">End of book</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
