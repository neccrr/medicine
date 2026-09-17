import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { marked } from "marked";
import { summaries } from "../lib/content";
import { writeJSON, STORAGE_KEYS } from "../lib/storage";

export function SummaryDetail() {
  const { subjectId = "" } = useParams();
  const markdown = summaries[subjectId];

  useEffect(() => {
    if (subjectId) {
      writeJSON(STORAGE_KEYS.lastRead(subjectId), new Date().toISOString());
    }
  }, [subjectId]);

  if (!markdown) {
    return (
      <section className="page">
        <p>Unknown subject.</p>
        <Link to="/summaries">Back to summaries</Link>
      </section>
    );
  }

  return (
    <section className="page">
      <Link to="/summaries" className="back-link">
        ← All summaries
      </Link>
      <div
        className="summary-content"
        dangerouslySetInnerHTML={{ __html: marked.parse(markdown, { async: false }) }}
      />
    </section>
  );
}
