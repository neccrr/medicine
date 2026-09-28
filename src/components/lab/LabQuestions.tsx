import { useState } from "react";
import type { LabQuestion } from "../../lib/labActivities";

const LETTERS = "ABCDEFGH";

/** The activity's check questions, answered one by one with instant feedback. */
export function LabQuestions({ questions }: { questions: LabQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const answered = Object.keys(answers).length;
  const correct = questions.filter((q, i) => answers[i] === q.answer).length;

  return (
    <section className="lab-card lab-questions" aria-labelledby="lab-questions-title">
      <div className="lab-questions-head">
        <h2 id="lab-questions-title">Check your understanding</h2>
        {answered > 0 && (
          <span className="lab-questions-score">
            {correct}/{questions.length} correct
            {answered === questions.length && (
              <button type="button" className="btn-link" onClick={() => setAnswers({})}>
                Try again
              </button>
            )}
          </span>
        )}
      </div>
      <ol className="lab-question-list">
        {questions.map((q, qi) => {
          const chosen = answers[qi];
          const revealed = chosen !== undefined;
          return (
            <li key={qi} className="lab-question">
              <p className="quiz-question-text">{q.question}</p>
              <div className="quiz-options" role="radiogroup" aria-label={q.question}>
                {q.options.map((opt, oi) => {
                  let cls = "quiz-option";
                  if (revealed) {
                    if (oi === q.answer) cls += " correct";
                    else if (oi === chosen) cls += " incorrect";
                  }
                  return (
                    <button
                      key={oi}
                      type="button"
                      className={cls}
                      role="radio"
                      aria-checked={chosen === oi}
                      disabled={revealed}
                      onClick={() => setAnswers((prev) => ({ ...prev, [qi]: oi }))}
                    >
                      <span className="quiz-option-letter">{LETTERS[oi]}</span>
                      <span className="quiz-option-text">{opt}</span>
                    </button>
                  );
                })}
              </div>
              {revealed && (
                <div className={`quiz-feedback ${chosen === q.answer ? "correct" : "incorrect"}`} role="status">
                  <p className="quiz-feedback-verdict">{chosen === q.answer ? "Correct" : "Not quite"}</p>
                  <p className="quiz-feedback-explanation">{q.explanation}</p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
