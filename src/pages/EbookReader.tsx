import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { marked } from "marked";
import { ebookChapters, ebookMeta, ebookPdfs } from "../lib/content";
import { readJSON, writeJSON, STORAGE_KEYS } from "../lib/storage";
import { recordActivity } from "../lib/activity";
import type { ReadingPosition } from "../types/content";

function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
      <path
        d="M7 17 17 7M9 7h8v8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EbookReader() {
  const { subjectId = "", chapterId } = useParams();
  const meta = ebookMeta[subjectId];
  const pdfs = ebookPdfs[subjectId] ?? [];
  const hasChapters = (meta?.chapters.length ?? 0) > 0;

  const position = readJSON<ReadingPosition | null>(
    STORAGE_KEYS.ebookPosition(subjectId),
    null,
  );

  useEffect(() => {
    if (!meta) return;
    recordActivity();
    if (chapterId) {
      writeJSON<ReadingPosition>(STORAGE_KEYS.ebookPosition(subjectId), {
        chapterId,
        scroll: 0,
        updatedAt: new Date().toISOString(),
      });
    }
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

  if (!chapterId && hasChapters) {
    const resumeChapter = position?.chapterId ?? meta.chapters[0]?.id;
    return <Navigate to={`/ebooks/${subjectId}/${resumeChapter}`} replace />;
  }

  const chapterIndex = hasChapters ? meta.chapters.findIndex((c) => c.id === chapterId) : -1;
  const chapter = meta.chapters[chapterIndex];
  const markdown = chapterId ? ebookChapters[`${subjectId}/${chapterId}`] : undefined;
  const prevChapter = meta.chapters[chapterIndex - 1];
  const nextChapter = meta.chapters[chapterIndex + 1];

  if (hasChapters && (!chapter || !markdown)) {
    return (
      <section className="page">
        <p>Unknown chapter.</p>
        <Link to="/ebooks">Back to ebooks</Link>
      </section>
    );
  }

  const sidebar = (
    <nav className="ebook-toc" aria-label="Book contents">
      <h2 className="ebook-toc-title">{meta.title}</h2>

      {hasChapters && (
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
      )}

      {pdfs.length > 0 && (
        <div className="ebook-toc-section">
          <h3 className="ebook-toc-subhead">PDF</h3>
          <ul className="ebook-toc-flat">
            {pdfs.map((pdf) => (
              <li key={pdf.url}>
                <a href={pdf.url} target="_blank" rel="noopener noreferrer" className="ebook-toc-link">
                  {pdf.name}
                  <ExternalIcon />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {meta.resources && meta.resources.length > 0 && (
        <div className="ebook-toc-section">
          <h3 className="ebook-toc-subhead">Further reading</h3>
          <ul className="ebook-toc-flat">
            {meta.resources.map((res) => (
              <li key={res.url}>
                <a href={res.url} target="_blank" rel="noopener noreferrer" className="ebook-toc-link">
                  {res.title}
                  <ExternalIcon />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );

  return (
    <section className="page ebook-page">
      <Link to="/ebooks" className="back-link">
        ← All ebooks
      </Link>
      <div className="ebook-layout">
        {sidebar}

        <div className="ebook-content">
          {hasChapters && markdown ? (
            <>
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
            </>
          ) : pdfs.length > 0 ? (
            <div className="pdf-viewer">
              <div className="pdf-viewer-bar">
                <p>{meta.description}</p>
                <a href={pdfs[0].url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                  Open in new tab
                  <ExternalIcon />
                </a>
              </div>
              <iframe
                src={pdfs[0].url}
                title={`${meta.title} PDF`}
                className="pdf-frame"
              />
            </div>
          ) : (
            <p>No content yet — drop a chapter or PDF into this subject's folder.</p>
          )}
        </div>
      </div>
    </section>
  );
}
