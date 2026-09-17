import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { quizBanks, quizGames } from "../lib/content";
import { useQuizProgress } from "../hooks/useQuizProgress";
import { ScoreSparkline } from "../components/ScoreSparkline";
import type { QuizAttempt, QuizQuestion } from "../types/content";

export function QuizPlay() {
  const { subjectId = "" } = useParams();
  const fullBank = quizBanks[subjectId] ?? [];
  const games = quizGames[subjectId] ?? [];
  const { history, recordAttempt } = useQuizProgress(subjectId);
  const [missedOnlyBank, setMissedOnlyBank] = useState<QuizQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<QuizAttempt | null>(null);

  const bank = missedOnlyBank ?? fullBank;

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
          <h1>{subjectId}</h1>
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

  const selectAnswer = (questionId: string, optionIndex: number) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = () => {
    const attempt = recordAttempt(bank, answers);
    setResult(attempt);
    setSubmitted(true);
  };

  const resetTo = (nextBank: QuizQuestion[] | null) => {
    setMissedOnlyBank(nextBank);
    setAnswers({});
    setSubmitted(false);
    setResult(null);
  };

  const missedQuestions = result
    ? bank.filter((q) => result.missedIds.includes(q.id))
    : [];

  return (
    <section className="page">
      <Link to="/quizzes" className="back-link">
        ← All quizzes
      </Link>
      <div className="quiz-header">
        <div>
          <h1>{subjectId}</h1>
          {missedOnlyBank && <p className="subtitle">Reviewing missed questions only</p>}
        </div>
        {history.length >= 2 && !missedOnlyBank && (
          <div className="quiz-trend" title="Score trend across recent attempts">
            <ScoreSparkline history={history} />
          </div>
        )}
      </div>

      {submitted && result && (
        <div className="quiz-result">
          Score: <strong>{result.score}/{result.total}</strong>
        </div>
      )}

      <ol className="quiz-list">
        {bank.map((q, qi) => {
          const selected = answers[q.id];
          const isCorrect = selected === q.answer;
          const questionLabelId = `question-${q.id}`;

          return (
            <li key={q.id} className="quiz-question">
              <p className="quiz-question-text" id={questionLabelId}>
                {qi + 1}. {q.question}
              </p>
              <div className="quiz-options" role="radiogroup" aria-labelledby={questionLabelId}>
                {q.options.map((opt, oi) => {
                  let cls = "quiz-option";
                  if (selected === oi) cls += " selected";
                  if (submitted && oi === q.answer) cls += " correct";
                  if (submitted && selected === oi && oi !== q.answer) cls += " incorrect";

                  return (
                    <button
                      key={oi}
                      className={cls}
                      onClick={() => selectAnswer(q.id, oi)}
                      disabled={submitted}
                      role="radio"
                      aria-checked={selected === oi}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <p className={`quiz-explanation ${isCorrect ? "correct" : "incorrect"}`} role="status">
                  {isCorrect ? "Correct. " : "Missed. "}
                  {q.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {!submitted ? (
        <button
          className="btn"
          onClick={handleSubmit}
          disabled={Object.keys(answers).length !== bank.length}
        >
          Submit ({Object.keys(answers).length}/{bank.length} answered)
        </button>
      ) : (
        <div className="quiz-retry-row">
          <button className="btn btn-secondary" onClick={() => resetTo(null)}>
            Retry full quiz
          </button>
          {missedQuestions.length > 0 && (
            <button className="btn" onClick={() => resetTo(missedQuestions)}>
              Review missed only ({missedQuestions.length})
            </button>
          )}
        </div>
      )}
    </section>
  );
}
