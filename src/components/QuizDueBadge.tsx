import { useState } from "react";
import { keyOf, quizSubjects } from "../lib/content";
import { readJSON, STORAGE_KEYS } from "../lib/storage";
import { QuizIcon } from "./icons";

function totalQuizDue(): number {
  return quizSubjects.reduce(
    (sum, s) => sum + readJSON<string[]>(STORAGE_KEYS.quizDue(keyOf(s)), []).length,
    0,
  );
}

export function QuizDueBadge() {
  const [due] = useState(totalQuizDue);

  if (due === 0) return null;

  return (
    <span className="quiz-due-badge" title={`${due} quiz question${due === 1 ? "" : "s"} due for review`}>
      <QuizIcon />
      {due}
    </span>
  );
}
