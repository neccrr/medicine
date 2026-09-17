import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { quizBanks } from "../lib/content";
import { useQuizProgress } from "../hooks/useQuizProgress";
import type { QuizAttempt } from "../types/content";

export function QuizPlay() {
  const { subjectId = "" } = useParams();
  const bank = quizBanks[subjectId] ?? [];
  const { recordAttempt } = useQuizProgress(subjectId);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<QuizAttempt | null>(null);

  if (bank.length === 0) {
    return (
      <section className="page">
        <p>Unknown subject.</p>
        <Link to="/quizzes">Back to quizzes</Link>
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

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setResult(null);
  };

  return (
    <section className="page">
      <Link to="/quizzes" className="back-link">
        ← All quizzes
      </Link>
      <h1>{subjectId}</h1>

      {submitted && result && (
        <div className="quiz-result">
          Score: <strong>{result.score}/{result.total}</strong>
        </div>
      )}

      <ol className="quiz-list">
        {bank.map((q, qi) => {
          const selected = answers[q.id];
          const isCorrect = selected === q.answer;

          return (
            <li key={q.id} className="quiz-question">
              <p className="quiz-question-text">
                {qi + 1}. {q.question}
              </p>
              <div className="quiz-options">
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
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <p className={`quiz-explanation ${isCorrect ? "correct" : "incorrect"}`}>
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
        <button className="btn" onClick={handleRetry}>
          Retry
        </button>
      )}
    </section>
  );
}
