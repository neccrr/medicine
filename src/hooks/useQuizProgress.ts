import type { QuizAttempt, QuizQuestion } from "../types/content";
import { STORAGE_KEYS } from "../lib/storage";
import { recordActivity } from "../lib/activity";
import { scoreQuiz, updateDueIds } from "../lib/quizScoring";
import { useLocalStorage } from "./useLocalStorage";

export function useQuizProgress(quizId: string) {
  const [history, setHistory] = useLocalStorage<QuizAttempt[]>(
    STORAGE_KEYS.quizProgress(quizId),
    [],
  );
  const [dueIds, setDueIds] = useLocalStorage<string[]>(
    STORAGE_KEYS.quizDue(quizId),
    [],
  );

  const lastAttempt: QuizAttempt | undefined = history[history.length - 1];

  const recordAttempt = (
    questions: QuizQuestion[],
    answers: Record<string, number>,
  ) => {
    const scored = scoreQuiz(questions, answers);
    const attempt: QuizAttempt = { ...scored, date: new Date().toISOString() };
    setHistory((prev) => [...prev, attempt]);
    setDueIds((prev) => updateDueIds(prev, questions, scored.missedIds));
    recordActivity();
    return attempt;
  };

  return { lastAttempt, history, dueIds, recordAttempt };
}
