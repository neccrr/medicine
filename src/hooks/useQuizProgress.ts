import type { QuizAttempt, QuizQuestion } from "../types/content";
import { STORAGE_KEYS } from "../lib/storage";
import { useLocalStorage } from "./useLocalStorage";

export function useQuizProgress(quizId: string) {
  const [history, setHistory] = useLocalStorage<QuizAttempt[]>(
    STORAGE_KEYS.quizProgress(quizId),
    [],
  );

  const lastAttempt: QuizAttempt | undefined = history[history.length - 1];

  const recordAttempt = (
    questions: QuizQuestion[],
    answers: Record<string, number>,
  ) => {
    const missedIds = questions
      .filter((q) => answers[q.id] !== q.answer)
      .map((q) => q.id);
    const attempt: QuizAttempt = {
      score: questions.length - missedIds.length,
      total: questions.length,
      date: new Date().toISOString(),
      missedIds,
    };
    setHistory((prev) => [...prev, attempt]);
    return attempt;
  };

  return { lastAttempt, history, recordAttempt };
}
