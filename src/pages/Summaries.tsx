import { Link } from "react-router-dom";
import { summarySubjects } from "../lib/content";
import { SubjectBadge } from "../components/SubjectBadge";

export function Summaries() {
  return (
    <section className="page">
      <h1>Summaries</h1>
      <p className="subtitle">High-yield written summaries by subject.</p>
      <div className="card-grid">
        {summarySubjects.map((subject) => (
          <Link key={subject.id} to={`/summaries/${subject.id}`} className="nav-card">
            <div className="nav-card-header">
              <SubjectBadge id={subject.id} label={subject.label} />
              <h2>{subject.label}</h2>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
