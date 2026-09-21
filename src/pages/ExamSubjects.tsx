import { Link } from "react-router-dom";
import { quizBanks, quizSubjects } from "../lib/content";
import { readJSON, STORAGE_KEYS } from "../lib/storage";
import { SubjectBadge } from "../components/SubjectBadge";
import type { ExamAttempt } from "../types/content";

export function ExamSubjects() {
  const examSubjects = quizSubjects.filter((s) => (quizBanks[s.id]?.length ?? 0) > 0);

  return (
    <section className="page">
      <h1>Exam</h1>
      <p className="subtitle">
        Timed, block-style practice exams — no instant feedback, scored at the end.
      </p>
      <div className="card-grid">
        {examSubjects.map((subject) => {
          const bank = quizBanks[subject.id];
          const history = readJSON<ExamAttempt[]>(STORAGE_KEYS.examHistory(subject.id), []);
          const last = history[history.length - 1];

          return (
            <Link key={subject.id} to={`/exam/${subject.id}`} className="nav-card">
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
