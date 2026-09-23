import { useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { modulesByBlockSubject, moduleSubjects } from "../lib/content";
import { blockById } from "../lib/blocks";
import { subjectHueStyle } from "../lib/subjectStyle";

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

export function ModuleViewer() {
  const { blockId = "", subjectId = "" } = useParams();
  const block = blockById(blockId);
  const subject = moduleSubjects.find((s) => s.id === subjectId);
  const pdfs = modulesByBlockSubject[`${blockId}/${subjectId}`] ?? [];
  const [selected, setSelected] = useState(0);

  if (!block || !subject) {
    return (
      <section className="page">
        <p>Unknown module subject.</p>
        <Link to="/modules">Back to modules</Link>
      </section>
    );
  }

  const current = pdfs[selected];

  return (
    <section className="page ebook-page subject-tinted" style={subjectHueStyle(subjectId) as CSSProperties}>
      <Link to="/modules" className="back-link">
        ← All modules
      </Link>

      {pdfs.length === 0 ? (
        <p>No lecture slides yet for this subject — drop a PDF into its module folder.</p>
      ) : (
        <div className="ebook-layout">
          <nav className="ebook-toc" aria-label="Lecture list">
            <h2 className="ebook-toc-title">{subject.label}</h2>
            <p className="ebook-toc-subhead">{block.label}</p>
            <ol>
              {pdfs.map((pdf, i) => (
                <li key={pdf.url}>
                  <button
                    type="button"
                    className={i === selected ? "ebook-toc-link active" : "ebook-toc-link"}
                    onClick={() => setSelected(i)}
                  >
                    {pdf.name}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div className="ebook-content">
            <div className="pdf-viewer">
              <div className="pdf-viewer-bar">
                <p>{current.name}</p>
                <a href={current.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                  Open in new tab
                  <ExternalIcon />
                </a>
              </div>
              <iframe src={current.url} title={current.name} className="pdf-frame" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
