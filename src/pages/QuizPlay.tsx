import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { quizBanks, quizGames, quizSubjects } from "../lib/content";
import { useQuizProgress } from "../hooks/useQuizProgress";
import { ScoreSparkline } from "../components/ScoreSparkline";
import { ConfettiBurst } from "../components/ConfettiBurst";
import { SubjectBadge } from "../components/SubjectBadge";
import { FlameIcon } from "../components/icons";
import { subjectHueStyle } from "../lib/subjectStyle";
import { readJSON, writeJSON, STORAGE_KEYS } from "../lib/storage";
import { buildSessionBank } from "../lib/quizShuffle";
import type { QuizAttempt, QuizQuestion } from "../types/content";

const OPTION_LETTERS = "ABCDEFGH";

interface InProgressSave {
  bank: QuizQuestion[];
  answers: Record<string, number>;
  currentIndex: number;
  total: number;
}

function scoreMessage(score: number, total: number): string {
  const pct = total === 0 ? 0 : score / total;
  if (pct === 1) return "Perfect score.";
  if (pct >= 0.9) return "Excellent work.";
  if (pct >= 0.75) return "Great work.";
  if (pct >= 0.5) return "Solid effort — a bit more practice will lock it in.";
  return "Worth another pass — review the explanations below.";
}

export function QuizPlay() {
  const { subjectId = "" } = useParams();
  const fullBank = quizBanks[subjectId] ?? [];
  const games = quizGames[subjectId] ?? [];
  const subjectLabel = quizSubjects.find((s) => s.id === subjectId)?.label ?? subjectId;
  const { history, dueIds, recordAttempt } = useQuizProgress(subjectId);
  const [started, setStarted] = useState(false);
  const [sessionBank, setSessionBank] = useState<QuizQuestion[] | null>(null);
  const [reviewMode, setReviewMode] = useState<"due" | "missed" | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<QuizAttempt | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const bank = sessionBank ?? [];
  const dueQuestions = fullBank.filter((q) => dueIds.includes(q.id));
  const savedProgress = readJSON<InProgressSave | null>(STORAGE_KEYS.quizInProgress(subjectId), null);
  const fullBankIds = new Set(fullBank.map((q) => q.id));
  const canResume =
    !!savedProgress &&
    savedProgress.total === fullBank.length &&
    savedProgress.currentIndex < savedProgress.total &&
    savedProgress.bank.length === fullBank.length &&
    savedProgress.bank.every((q) => fullBankIds.has(q.id));

  const persistProgress = (nextAnswers: Record<string, number>, nextIndex: number) => {
    if (reviewMode || !sessionBank) return;
    writeJSON(STORAGE_KEYS.quizInProgress(subjectId), {
      bank: sessionBank,
      answers: nextAnswers,
      currentIndex: nextIndex,
      total: fullBank.length,
    });
  };

  const clearInProgress = () => writeJSON(STORAGE_KEYS.quizInProgress(subjectId), null);

  const beginQuiz = (resume: boolean) => {
    if (resume && savedProgress && canResume) {
      setSessionBank(savedProgress.bank);
      setAnswers(savedProgress.answers);
      setCurrentIndex(savedProgress.currentIndex);
    } else {
      clearInProgress();
      setSessionBank(buildSessionBank(fullBank));
      setAnswers({});
      setCurrentIndex(0);
    }
    setReviewMode(null);
    setFinished(false);
    setResult(null);
    setStarted(true);
  };

  const currentQuestion = bank[currentIndex];
  const selected = currentQuestion ? answers[currentQuestion.id] : undefined;
  const revealed = selected !== undefined;
  const isLast = currentIndex === bank.length - 1;
  const answeredCount = bank.filter((q) => answers[q.id] !== undefined).length;

  let streak = 0;
  for (let i = currentIndex - (revealed ? 0 : 1); i >= 0; i--) {
    const q = bank[i];
    if (!q || answers[q.id] !== q.answer) break;
    streak++;
  }

  const selectAnswer = (optionIndex: number) => {
    if (revealed || !currentQuestion) return;
    const nextAnswers = { ...answers, [currentQuestion.id]: optionIndex };
    setAnswers(nextAnswers);
    persistProgress(nextAnswers, currentIndex);
  };

  const goToQuestion = (index: number) => {
    if (index < 0 || index >= bank.length) return;
    setCurrentIndex(index);
    persistProgress(answers, index);
  };

  const goPrev = () => goToQuestion(currentIndex - 1);

  const finishQuiz = () => {
    const attempt = recordAttempt(bank, answers);
    setResult(attempt);
    setFinished(true);
    if (!reviewMode) clearInProgress();
  };

  const goNext = () => {
    if (!isLast) {
      goToQuestion(currentIndex + 1);
      return;
    }
    finishQuiz();
  };

  const startBank = (nextBank: QuizQuestion[] | null, mode: "due" | "missed" | null) => {
    setSessionBank(buildSessionBank(nextBank ?? fullBank));
    setReviewMode(mode);
    setCurrentIndex(0);
    setAnswers({});
    setFinished(false);
    setResult(null);
    setReviewOpen(false);
    if (!nextBank) clearInProgress();
  };

  useEffect(() => {
    if (!started || finished || !currentQuestion) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (revealed || isLast) goNext();
        else goToQuestion(currentIndex + 1);
        return;
      }
      if (!revealed) {
        const letterIdx = OPTION_LETTERS.indexOf(e.key.toUpperCase());
        const digitIdx = "123456789".indexOf(e.key);
        const idx = letterIdx >= 0 ? letterIdx : digitIdx;
        if (idx >= 0 && idx < currentQuestion.options.length) {
          e.preventDefault();
          selectAnswer(idx);
        }
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        goNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, finished, currentQuestion, revealed, answers, currentIndex, isLast]);

  const missedQuestions = result ? bank.filter((q) => result.missedIds.includes(q.id)) : [];

  const navScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!started || finished) return;
    const el = navScrollRef.current?.querySelector<HTMLElement>(".quiz-nav-pill.current");
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [currentIndex, started, finished]);

  if (fullBank.length === 0 && games.length === 0) {
    return (
      <section className="page">
        <p>Unknown subject.</p>
        <Link to="/quizzes">Back to quizzes</Link>
      </section>
    );
  }

  if (fullBank.length === 0) {
    return (
      <section className="page subject-tinted" style={subjectHueStyle(subjectId) as CSSProperties}>
        <Link to="/quizzes" className="back-link">
          ← All quizzes
        </Link>
        <div className="quiz-header">
          <h1>{subjectLabel}</h1>
        </div>
        {games.map((game) => (
          <div key={game.url} className="pdf-viewer">
            <div className="pdf-viewer-bar">
              <p>{game.name}</p>
              <a href={game.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                Open in new tab
              </a>
            </div>
            <iframe src={game.url} title={game.name} className="pdf-frame" />
          </div>
        ))}
      </section>
    );
  }

  if (!started) {
    return (
      <section className="page subject-tinted" style={subjectHueStyle(subjectId) as CSSProperties}>
        <Link to="/quizzes" className="back-link">
          ← All quizzes
        </Link>
        <div className="quiz-start">
          <div className="quiz-start-badge">
            <SubjectBadge id={subjectId} label={subjectLabel} />
          </div>
          <h1>{subjectLabel}</h1>
          <p className="subtitle">
            {fullBank.length} question{fullBank.length === 1 ? "" : "s"} · one at a time, with instant feedback
          </p>

          {history.length >= 2 && (
            <div className="quiz-trend quiz-start-trend" title="Score trend across recent attempts">
              <ScoreSparkline history={history} />
            </div>
          )}

          {games.length > 0 && (
            <div className="quiz-game-links">
              {games.map((game) => (
                <a key={game.url} href={game.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                  Also try: {game.name} ↗
                </a>
              ))}
            </div>
          )}

          {dueQuestions.length > 0 && (
            <div className="quiz-due-banner">
              <p>
                <strong>{dueQuestions.length}</strong> question{dueQuestions.length === 1 ? "" : "s"} due
                for review from past attempts.
              </p>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  startBank(dueQuestions, "due");
                  setStarted(true);
                }}
              >
                Review due questions
              </button>
            </div>
          )}

          <div className="quiz-start-actions">
            {canResume && savedProgress && (
              <button className="btn btn-secondary" onClick={() => beginQuiz(true)}>
                Resume ({savedProgress.currentIndex + 1}/{savedProgress.total})
              </button>
            )}
            <button className="btn quiz-start-btn" onClick={() => beginQuiz(false)}>
              {canResume ? "Start over" : "Start quiz"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page subject-tinted" style={subjectHueStyle(subjectId) as CSSProperties}>
      <Link to="/quizzes" className="back-link">
        ← All quizzes
      </Link>
      <div className="quiz-header">
        <div>
          <h1>{subjectLabel}</h1>
          {reviewMode && <p className="subtitle">Reviewing {reviewMode} questions only</p>}
        </div>
        {history.length >= 2 && !reviewMode && (
          <div className="quiz-trend" title="Score trend across recent attempts">
            <ScoreSparkline history={history} />
          </div>
        )}
      </div>

      {games.length > 0 && (
        <div className="quiz-game-links">
          {games.map((game) => (
            <a key={game.url} href={game.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              Also try: {game.name} ↗
            </a>
          ))}
        </div>
      )}

      {!reviewMode && !finished && dueQuestions.length > 0 && (
        <div className="quiz-due-banner">
          <p>
            <strong>{dueQuestions.length}</strong> question{dueQuestions.length === 1 ? "" : "s"} due
            for review from past attempts.
          </p>
          <button className="btn btn-secondary" onClick={() => startBank(dueQuestions, "due")}>
            Review due questions
          </button>
        </div>
      )}

      {!finished ? (
        <div className="quiz-card">
          <div className="quiz-progress">
            <div className="quiz-progress-track">
              <div
                className="quiz-progress-fill"
                style={{ width: `${(answeredCount / bank.length) * 100}%` }}
              />
            </div>
            <span className="quiz-progress-label">
              Question {currentIndex + 1} of {bank.length}
            </span>
            {streak >= 3 && (
              <span className="quiz-streak-badge" title={`${streak} correct in a row`}>
                <FlameIcon />
                {streak}
              </span>
            )}
          </div>

          <div className="quiz-nav-strip" ref={navScrollRef}>
            {bank.map((q, qi) => {
              const ans = answers[q.id];
              let cls = "quiz-nav-pill";
              if (qi === currentIndex) cls += " current";
              if (ans !== undefined) cls += ans === q.answer ? " correct" : " incorrect";
              return (
                <button
                  key={q.id}
                  type="button"
                  className={cls}
                  onClick={() => goToQuestion(qi)}
                  aria-current={qi === currentIndex ? "true" : undefined}
                  aria-label={`Go to question ${qi + 1}`}
                  title={`Question ${qi + 1}`}
                >
                  {qi + 1}
                </button>
              );
            })}
          </div>

          <p className="quiz-question-text">{currentQuestion.question}</p>

          {currentQuestion.image && (
            <div className="quiz-question-image" dangerouslySetInnerHTML={{ __html: currentQuestion.image }} />
          )}

          <div className="quiz-options" role="radiogroup" aria-label={currentQuestion.question}>
            {currentQuestion.options.map((opt, oi) => {
              let cls = "quiz-option";
              if (revealed) {
                if (oi === currentQuestion.answer) cls += " correct";
                else if (oi === selected) cls += " incorrect";
              } else if (selected === oi) {
                cls += " selected";
              }

              return (
                <button
                  key={oi}
                  className={cls}
                  onClick={() => selectAnswer(oi)}
                  disabled={revealed}
                  role="radio"
                  aria-checked={selected === oi}
                >
                  <span className="quiz-option-letter">{OPTION_LETTERS[oi]}</span>
                  <span className="quiz-option-text">{opt}</span>
                </button>
              );
            })}
          </div>

          <p className="quiz-keyboard-hint">
            {!revealed ? "Tip: press a letter to answer" : "Tip: press Enter to continue"} · ← → to move between
            questions
          </p>

          {revealed && (
            <div className={`quiz-feedback ${selected === currentQuestion.answer ? "correct" : "incorrect"}`} role="status">
              <p className="quiz-feedback-verdict">
                {selected === currentQuestion.answer ? "Correct" : "Not quite"}
              </p>
              <p className="quiz-feedback-explanation">{currentQuestion.explanation}</p>
            </div>
          )}

          <div className="quiz-nav-buttons">
            <button
              type="button"
              className="btn btn-secondary quiz-prev-btn"
              onClick={goPrev}
              disabled={currentIndex === 0}
            >
              ← Previous
            </button>
            {revealed ? (
              <button className="btn quiz-next-btn" onClick={goNext}>
                {isLast ? "See results" : "Next question"}
              </button>
            ) : isLast ? (
              <button type="button" className="btn btn-secondary quiz-skip-btn" onClick={finishQuiz}>
                Finish quiz
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary quiz-skip-btn"
                onClick={() => goToQuestion(currentIndex + 1)}
              >
                Skip →
              </button>
            )}
          </div>
        </div>
      ) : (
        result && (
          <div className="quiz-results">
            <div className={`quiz-score-hero${result.score === result.total ? " perfect" : ""}`}>
              {result.score === result.total && <ConfettiBurst />}
              <p className="quiz-score-value">
                {result.score}
                <span className="quiz-score-total">/{result.total}</span>
              </p>
              <p className="quiz-score-caption">{scoreMessage(result.score, result.total)}</p>
            </div>

            <div className="quiz-retry-row">
              <button className="btn btn-secondary" onClick={() => startBank(null, null)}>
                Retry full quiz
              </button>
              {missedQuestions.length > 0 && (
                <button className="btn" onClick={() => startBank(missedQuestions, "missed")}>
                  Review missed only ({missedQuestions.length})
                </button>
              )}
            </div>

            <button
              className="btn btn-secondary quiz-review-toggle"
              onClick={() => setReviewOpen((v) => !v)}
              aria-expanded={reviewOpen}
            >
              {reviewOpen ? "Hide full review ▲" : "Show full review ▼"}
            </button>

            {reviewOpen && (
              <ol className="quiz-review-list">
                {bank.map((q, qi) => {
                  const chosen = answers[q.id];
                  const wasCorrect = chosen === q.answer;
                  return (
                    <li key={q.id} className="quiz-review-item">
                      <p className="quiz-question-text">
                        {qi + 1}. {q.question}
                      </p>
                      {q.image && (
                        <div className="quiz-question-image quiz-question-image-small" dangerouslySetInnerHTML={{ __html: q.image }} />
                      )}
                      <div className="quiz-options quiz-options-static">
                        {q.options.map((opt, oi) => {
                          let cls = "quiz-option";
                          if (oi === q.answer) cls += " correct";
                          else if (oi === chosen) cls += " incorrect";
                          return (
                            <div key={oi} className={cls}>
                              <span className="quiz-option-letter">{OPTION_LETTERS[oi]}</span>
                              <span className="quiz-option-text">{opt}</span>
                            </div>
                          );
                        })}
                      </div>
                      <p className={`quiz-feedback-explanation quiz-review-explanation ${wasCorrect ? "correct" : "incorrect"}`}>
                        {wasCorrect ? "Correct. " : "Missed. "}
                        {q.explanation}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )
      )}
    </section>
  );
}
