import { Link } from "react-router-dom";
import { summarySubjects } from "../lib/content";

export function Summaries() {
  return (
    <section className="page">
      <h1>Summaries</h1>
      <p className="subtitle">High-yield written summaries by subject.</p>
      <div className="card-grid">
        {summarySubjects.map((subject) => (
          <Link key={subject.id} to={`/summaries/${subject.id}`} className="nav-card">
            <h2>{subject.label}</h2>
          </Link>
        ))}
      </div>
    </section>
  );
}
