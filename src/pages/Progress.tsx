import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { exportAllProgress, importAllProgress, readJSON, STORAGE_KEYS } from "../lib/storage";
import { getActivityDays, getCurrentStreak, getLongestStreak } from "../lib/activity";
import { flashcardDecks, flashcardSubjects } from "../lib/content";
import { rankGlobalHardestCards } from "../lib/hardestCards";
import { ActivityHeatmap } from "../components/ActivityHeatmap";
import { SubjectBadge } from "../components/SubjectBadge";
import type { CardStateMap } from "../types/content";

function buildGlobalHardestCards() {
  const subjects = flashcardSubjects.map((s) => ({
    id: s.id,
    label: s.label,
    deck: flashcardDecks[s.id],
    stateMap: readJSON<CardStateMap>(STORAGE_KEYS.cardState(s.id), {}),
  }));
  return rankGlobalHardestCards(subjects, 8);
}

export function Progress() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [activityDays, setActivityDays] = useState<string[]>(() => getActivityDays());
  const globalHardestCards = buildGlobalHardestCards();

  const handleExport = () => {
    const data = exportAllProgress();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medicine-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileInput.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      importAllProgress(data);
      setActivityDays(getActivityDays());
      setMessage("Progress imported. Reload any open pages to see updated stats.");
    } catch {
      setMessage("Could not read that file — is it a valid export?");
    } finally {
      e.target.value = "";
    }
  };

  const streak = getCurrentStreak(activityDays);
  const longest = getLongestStreak(activityDays);

  return (
    <section className="page">
      <h1>Progress</h1>
      <p className="subtitle">
        Everything lives in this browser's local storage — nothing is sent to a
        server. Export a backup, or move your progress to another device.
      </p>

      <div className="streak-stats">
        <div className="stat-tile">
          <span className="stat-label">Current streak</span>
          <span className="stat-value">{streak}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Longest streak</span>
          <span className="stat-value">{longest}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Total study days</span>
          <span className="stat-value">{activityDays.length}</span>
        </div>
      </div>

      {activityDays.length > 0 && (
        <div className="heatmap-wrapper">
          <ActivityHeatmap days={activityDays} />
        </div>
      )}

      {globalHardestCards.length > 0 && (
        <div className="global-hardest-cards">
          <h2>Your hardest cards, across every subject</h2>
          <p className="subtitle">The flashcards you've lapsed on most — worth a targeted review.</p>
          <ul>
            {globalHardestCards.map(({ card, lapses, subjectId, subjectLabel }) => (
              <li key={`${subjectId}-${card.id}`}>
                <Link to={`/flashcards/${subjectId}`} className="global-hardest-card-link">
                  <SubjectBadge id={subjectId} label={subjectLabel} />
                  <span className="global-hardest-card-front">{card.front}</span>
                  <span className="lapse-count">{lapses} lapse{lapses === 1 ? "" : "s"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="progress-actions">
        <button className="btn" onClick={handleExport}>
          Export progress (JSON)
        </button>
        <button className="btn btn-secondary" onClick={handleImportClick}>
          Import progress
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          hidden
          onChange={handleFileChange}
        />
      </div>

      {message && <p className="progress-message">{message}</p>}

      <p className="fine-print">
        Clearing your browser's site data, or switching browsers/devices, will
        lose progress unless you've exported it first.
      </p>
    </section>
  );
}
