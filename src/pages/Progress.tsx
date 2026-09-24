import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { exportAllProgress, importAllProgress, readJSON, writeJSON, STORAGE_KEYS } from "../lib/storage";
import { getActivityDays, getCurrentStreak, getLongestStreak } from "../lib/activity";
import { flashcardDecks, flashcardSubjects } from "../lib/content";
import { groupByBlock } from "../lib/blocks";
import { rankGlobalHardestCards } from "../lib/hardestCards";
import { INITIAL_CARD_STATE, isDue } from "../lib/sm2";
import { generateStudyPlan } from "../lib/studyPlan";
import { ActivityHeatmap } from "../components/ActivityHeatmap";
import { SubjectBadge } from "../components/SubjectBadge";
import { RadialGauge } from "../components/RadialGauge";
import { BackupNudge } from "../components/BackupNudge";
import { useCountUp } from "../hooks/useCountUp";
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

function buildDeckStats(subjectId: string) {
  const deck = flashcardDecks[subjectId] ?? [];
  const stateMap = readJSON<CardStateMap>(STORAGE_KEYS.cardState(subjectId), {});
  const total = deck.length;
  const mastered = deck.filter((c) => (stateMap[c.id]?.interval ?? 0) >= 21).length;
  const due = deck.filter((c) => isDue(stateMap[c.id] ?? INITIAL_CARD_STATE)).length;
  return { total, mastered, due };
}

export function Progress() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [activityDays, setActivityDays] = useState<string[]>(() => getActivityDays());
  const globalHardestCards = buildGlobalHardestCards();

  const [planSubjectId, setPlanSubjectId] = useState(flashcardSubjects[0]?.id ?? "");
  const [examDate, setExamDate] = useState<string>(() =>
    readJSON<string>(STORAGE_KEYS.examDate(planSubjectId), ""),
  );

  const handlePlanSubjectChange = (id: string) => {
    setPlanSubjectId(id);
    setExamDate(readJSON<string>(STORAGE_KEYS.examDate(id), ""));
  };

  const handleExamDateChange = (value: string) => {
    setExamDate(value);
    writeJSON(STORAGE_KEYS.examDate(planSubjectId), value);
  };

  const planDeckStats = buildDeckStats(planSubjectId);
  const studyPlan = generateStudyPlan({
    examDate: examDate || null,
    totalCards: planDeckStats.total,
    masteredCards: planDeckStats.mastered,
    dueCards: planDeckStats.due,
  });

  const [, setExportedAt] = useState<string | null>(null);

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

    const now = new Date().toISOString();
    writeJSON(STORAGE_KEYS.lastExport, now);
    setExportedAt(now);
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
  const streakCount = useCountUp(streak);
  const longestCount = useCountUp(longest);
  const studyDaysCount = useCountUp(activityDays.length);

  return (
    <section className="page">
      <h1>Progress</h1>
      <p className="subtitle">
        Everything lives in this browser's local storage — nothing is sent to a
        server. Export a backup, or move your progress to another device.
      </p>

      <BackupNudge showLink={false} />

      <div className="streak-stats">
        <div className="stat-tile">
          <span className="stat-label">Current streak</span>
          <span className="stat-value">{streakCount}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Longest streak</span>
          <span className="stat-value">{longestCount}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Total study days</span>
          <span className="stat-value">{studyDaysCount}</span>
        </div>
      </div>

      {activityDays.length > 0 && (
        <div className="heatmap-wrapper">
          <ActivityHeatmap days={activityDays} />
        </div>
      )}

      {flashcardSubjects.length > 0 && (
        <div className="mastery-by-subject">
          <h2>Mastery by subject</h2>
          <p className="subtitle">Cards with a 21+ day review interval count as mastered.</p>
          {groupByBlock(flashcardSubjects).map(({ block, subjects }) =>
            subjects.length > 0 ? (
              <div key={block.id} className="block-section">
                <h3 className="block-section-heading">{block.label}</h3>
                <ul className="mastery-list">
                  {subjects.map((s) => {
                    const stats = buildDeckStats(s.id);
                    const percent = stats.total > 0 ? (stats.mastered / stats.total) * 100 : 0;
                    return (
                      <li key={s.id}>
                        <Link to={`/flashcards/${block.id}/${s.id}`} className="mastery-row">
                          <RadialGauge
                            percent={percent}
                            size={40}
                            label={`${Math.round(percent)}% of ${s.label} mastered`}
                          />
                          <SubjectBadge id={s.id} label={s.label} />
                          <span className="mastery-row-body">
                            <span className="mastery-row-label">{s.label}</span>
                            <span className="mastery-row-detail">
                              {stats.mastered}/{stats.total} mastered
                              {stats.due > 0 ? ` · ${stats.due} due` : ""}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null,
          )}
        </div>
      )}

      {flashcardSubjects.length > 0 && (
        <div className="study-plan">
          <h2>Study plan</h2>
          <p className="subtitle">Set an exam date and get a daily review pace to clear the deck in time.</p>
          <div className="study-plan-controls">
            <select
              className="form-select"
              value={planSubjectId}
              onChange={(e) => handlePlanSubjectChange(e.target.value)}
              aria-label="Subject"
            >
              {groupByBlock(flashcardSubjects).map(({ block, subjects }) =>
                subjects.length > 0 ? (
                  <optgroup key={block.id} label={block.label}>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </optgroup>
                ) : null,
              )}
            </select>
            <input
              type="date"
              className="form-input"
              value={examDate}
              onChange={(e) => handleExamDateChange(e.target.value)}
              aria-label="Exam date"
            />
          </div>
          <p className={`study-plan-message study-plan-${studyPlan.status}`}>{studyPlan.message}</p>
        </div>
      )}

      {globalHardestCards.length > 0 && (
        <div className="global-hardest-cards">
          <h2>Your hardest cards, across every subject</h2>
          <p className="subtitle">The flashcards you've lapsed on most — worth a targeted review.</p>
          <ul>
            {globalHardestCards.map(({ card, lapses, subjectId, subjectLabel }) => (
              <li key={`${subjectId}-${card.id}`}>
                <Link to={`/flashcards/${flashcardSubjects.find((s) => s.id === subjectId)?.blockId}/${subjectId}`} className="global-hardest-card-link">
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
