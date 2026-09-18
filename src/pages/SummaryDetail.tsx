import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { marked } from "marked";
import { summaries } from "../lib/content";
import { writeJSON, STORAGE_KEYS } from "../lib/storage";
import { useReadingPrefs } from "../hooks/useReadingPrefs";
import { ReadingControls } from "../components/ReadingControls";

export function SummaryDetail() {
  const { subjectId = "" } = useParams();
  const markdown = summaries[subjectId];
  const [readingPrefs, setReadingPrefs] = useReadingPrefs();

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
      <ReadingControls prefs={readingPrefs} onChange={setReadingPrefs} />
      <div
        className="summary-content"
        style={{
          fontSize: `${readingPrefs.fontScale}rem`,
          fontFamily: readingPrefs.accessibleFont ? "var(--font-reading-accessible)" : undefined,
        }}
        dangerouslySetInnerHTML={{ __html: marked.parse(markdown, { async: false }) }}
      />
    </section>
  );
}
