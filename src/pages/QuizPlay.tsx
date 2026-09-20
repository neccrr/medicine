import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { quizBanks, quizGames, quizSubjects } from "../lib/content";
import { useQuizProgress } from "../hooks/useQuizProgress";
import { ScoreSparkline } from "../components/ScoreSparkline";
import type { QuizAttempt, QuizQuestion } from "../types/content";

const OPTION_LETTERS = "ABCDEFGH";

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
  const [activeBank, setActiveBank] = useState<QuizQuestion[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<QuizAttempt | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const bank = activeBank ?? fullBank;
  const dueQuestions = fullBank.filter((q) => dueIds.includes(q.id));

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
      <section className="page">
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

  const currentQuestion = bank[currentIndex];
  const selected = answers[currentQuestion.id];
  const revealed = selected !== undefined;
  const isLast = currentIndex === bank.length - 1;
  const answeredCount = currentIndex + (revealed ? 1 : 0);

  const selectAnswer = (optionIndex: number) => {
    if (revealed) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionIndex }));
  };

  const goNext = () => {
    if (!isLast) {
      setCurrentIndex((i) => i + 1);
      return;
    }
    const attempt = recordAttempt(bank, answers);
    setResult(attempt);
    setFinished(true);
  };

  const startBank = (nextBank: QuizQuestion[] | null) => {
    setActiveBank(nextBank);
    setCurrentIndex(0);
    setAnswers({});
    setFinished(false);
    setResult(null);
    setReviewOpen(false);
  };

  const missedQuestions = result ? bank.filter((q) => result.missedIds.includes(q.id)) : [];

  return (
    <section className="page">
      <Link to="/quizzes" className="back-link">
        ← All quizzes
      </Link>
      <div className="quiz-header">
        <div>
          <h1>{subjectLabel}</h1>
          {activeBank && <p className="subtitle">Reviewing {activeBank === dueQuestions ? "due" : "missed"} questions only</p>}
        </div>
        {history.length >= 2 && !activeBank && (
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

      {!activeBank && !finished && dueQuestions.length > 0 && (
        <div className="quiz-due-banner">
          <p>
            <strong>{dueQuestions.length}</strong> question{dueQuestions.length === 1 ? "" : "s"} due
            for review from past attempts.
          </p>
          <button className="btn btn-secondary" onClick={() => startBank(dueQuestions)}>
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
          </div>

          <p className="quiz-question-text">{currentQuestion.question}</p>

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

          {revealed && (
            <div className={`quiz-feedback ${selected === currentQuestion.answer ? "correct" : "incorrect"}`} role="status">
              <p className="quiz-feedback-verdict">
                {selected === currentQuestion.answer ? "Correct" : "Not quite"}
              </p>
              <p className="quiz-feedback-explanation">{currentQuestion.explanation}</p>
            </div>
          )}

          {revealed && (
            <button className="btn quiz-next-btn" onClick={goNext}>
              {isLast ? "See results" : "Next question"}
            </button>
          )}
        </div>
      ) : (
        result && (
          <div className="quiz-results">
            <div className="quiz-score-hero">
              <p className="quiz-score-value">
                {result.score}
                <span className="quiz-score-total">/{result.total}</span>
              </p>
              <p className="quiz-score-caption">{scoreMessage(result.score, result.total)}</p>
            </div>

            <div className="quiz-retry-row">
              <button className="btn btn-secondary" onClick={() => startBank(null)}>
                Retry full quiz
              </button>
              {missedQuestions.length > 0 && (
                <button className="btn" onClick={() => startBank(missedQuestions)}>
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
