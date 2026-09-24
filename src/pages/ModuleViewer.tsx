import { useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { modulesByBlockSubject, moduleSubjects, type ModulePdf } from "../lib/content";
import { blockById } from "../lib/blocks";
import { groupModules } from "../lib/moduleSections";
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
  const subject = moduleSubjects.find((s) => s.id === subjectId && s.blockId === blockId);
  const pdfs = modulesByBlockSubject[`${blockId}/${subjectId}`] ?? [];
  const groups = groupModules(pdfs);
  const ordered = groups ? groups.flatMap((g) => g.sections.flatMap((s) => s.pdfs)) : pdfs;
  const [selectedUrl, setSelectedUrl] = useState<string>();

  if (!block || !subject) {
    return (
      <section className="page">
        <p>Unknown module subject.</p>
        <Link to="/modules">Back to modules</Link>
      </section>
    );
  }

  const current = ordered.find((p) => p.url === selectedUrl) ?? ordered[0];

  const pdfList = (list: ModulePdf[]) => (
    <ol>
      {list.map((pdf) => (
        <li key={pdf.url}>
          <button
            type="button"
            className={pdf.url === current.url ? "ebook-toc-link active" : "ebook-toc-link"}
            onClick={() => setSelectedUrl(pdf.url)}
          >
            {pdf.name}
          </button>
        </li>
      ))}
    </ol>
  );

  return (
    <section className="page ebook-page subject-tinted" style={subjectHueStyle(subjectId) as CSSProperties}>
      <Link to="/modules" className="back-link">
        ← All modules
      </Link>

      {pdfs.length === 0 ? (
        <p>No PDFs yet for this subject — drop one into its module folder.</p>
      ) : (
        <div className="ebook-layout">
          <nav className="ebook-toc" aria-label="Module list">
            <h2 className="ebook-toc-title">{subject.label}</h2>
            <p className="ebook-toc-subhead">{block.label}</p>
            {groups
              ? groups.map((group) => (
                  <div key={group.id} className="ebook-toc-section">
                    <p className="ebook-toc-group">{group.label}</p>
                    {group.sections.map((section) => (
                      <div key={section.id} className="ebook-toc-part">
                        {section.label && <p className="ebook-toc-sublabel">{section.label}</p>}
                        {section.pdfs.length > 0 ? (
                          pdfList(section.pdfs)
                        ) : (
                          <p className="ebook-toc-empty">To be added</p>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              : pdfList(pdfs)}
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
