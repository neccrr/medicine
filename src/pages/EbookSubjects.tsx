import { Link } from "react-router-dom";
import { ebookMeta, ebookPdfs, ebookSubjects } from "../lib/content";
import { readJSON, STORAGE_KEYS } from "../lib/storage";
import { SubjectBadge } from "../components/SubjectBadge";
import type { ReadingPosition } from "../types/content";

export function EbookSubjects() {
  return (
    <section className="page">
      <h1>Ebooks</h1>
      <p className="subtitle">Chapter readers, reference PDFs, and curated links by subject.</p>
      <div className="card-grid">
        {ebookSubjects.map((subject) => {
          const meta = ebookMeta[subject.id];
          const pdfs = ebookPdfs[subject.id] ?? [];
          const position = readJSON<ReadingPosition | null>(
            STORAGE_KEYS.ebookPosition(subject.id),
            null,
          );
          const chapterIndex = position
            ? meta.chapters.findIndex((c) => c.id === position.chapterId)
            : -1;

          const parts: string[] = [];
          if (meta.chapters.length > 0) parts.push(`${meta.chapters.length} chapters`);
          if (pdfs.length > 0) parts.push(pdfs.length === 1 ? "PDF" : `${pdfs.length} PDFs`);
          if (meta.resources?.length) parts.push(`${meta.resources.length} links`);

          return (
            <Link key={subject.id} to={`/ebooks/${subject.id}`} className="nav-card">
              <div className="nav-card-header">
                <SubjectBadge id={subject.id} label={meta.title} />
                <h2>{meta.title}</h2>
              </div>
              <p>{meta.description}</p>
              <p className="nav-card-meta">
                {parts.join(" · ")}
                {chapterIndex >= 0 && <> · resume at chapter {chapterIndex + 1}</>}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
