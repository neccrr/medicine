import { Link } from "react-router-dom";
import { quizBanks, quizSubjects } from "../lib/content";
import { readJSON, STORAGE_KEYS } from "../lib/storage";
import { SubjectBadge } from "../components/SubjectBadge";
import type { QuizAttempt } from "../types/content";

export function QuizSubjects() {
  return (
    <section className="page">
      <h1>Quizzes</h1>
      <p className="subtitle">Multiple-choice question banks with instant scoring.</p>
      <div className="card-grid">
        {quizSubjects.map((subject) => {
          const bank = quizBanks[subject.id];
          const history = readJSON<QuizAttempt[]>(
            STORAGE_KEYS.quizProgress(subject.id),
            [],
          );
          const last = history[history.length - 1];

          return (
            <Link key={subject.id} to={`/quizzes/${subject.id}`} className="nav-card">
              <div className="nav-card-header">
                <SubjectBadge id={subject.id} label={subject.label} />
                <h2>{subject.label}</h2>
              </div>
              <p>
                {bank.length} questions
                {last && (
                  <>
                    {" "}
                    · last score <strong>{last.score}/{last.total}</strong>
                  </>
                )}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
