import { Link } from "react-router-dom";
import { moduleSubjects, modulesByBlockSubject } from "../lib/content";
import { groupByBlock } from "../lib/blocks";
import { SubjectBadge } from "../components/SubjectBadge";
import { UpcomingSubjectCard } from "../components/UpcomingSubjectCard";

export function Modules() {
  const groups = groupByBlock(moduleSubjects);

  if (groups.length === 0) {
    return (
      <section className="page">
        <h1>Modules</h1>
        <p className="subtitle">No lecture slides yet — drop a PDF into a subject's module folder.</p>
      </section>
    );
  }

  return (
    <section className="page">
      <h1>Modules</h1>
      <p className="subtitle">Original lecture slides, as PDFs — organized by block and subject.</p>
      {groups.map(({ block, subjects, upcoming }) => (
        <div key={block.id} className="block-section">
          <h2 className="block-section-heading">{block.label}</h2>
          <div className="card-grid">
            {subjects.map((subject) => {
              const pdfs = modulesByBlockSubject[`${block.id}/${subject.id}`] ?? [];
              return (
                <Link key={subject.id} to={`/modules/${block.id}/${subject.id}`} className="nav-card">
                  <div className="nav-card-header">
                    <SubjectBadge id={subject.id} label={subject.label} />
                    <h2>{subject.label}</h2>
                  </div>
                  <p>
                    {pdfs.length} lecture{pdfs.length === 1 ? "" : "s"}
                  </p>
                </Link>
              );
            })}
            {subjects.length === 0 &&
              upcoming.map((u) => <UpcomingSubjectCard key={u.id} id={u.id} label={u.label} />)}
          </div>
        </div>
      ))}
    </section>
  );
}
