import type { ExamAttempt, QuizQuestion } from "../types/content";
import { STORAGE_KEYS } from "../lib/storage";
import { recordActivity } from "../lib/activity";
import { scoreQuiz } from "../lib/quizScoring";
import { useLocalStorage } from "./useLocalStorage";

export function useExamHistory(subjectId: string) {
  const [history, setHistory] = useLocalStorage<ExamAttempt[]>(
    STORAGE_KEYS.examHistory(subjectId),
    [],
  );

  const lastAttempt: ExamAttempt | undefined = history[history.length - 1];

  const recordAttempt = (
    questions: QuizQuestion[],
    answers: Record<string, number>,
    timeTakenSec: number,
    timeLimitSec: number,
  ) => {
    const scored = scoreQuiz(questions, answers);
    const attempt: ExamAttempt = {
      ...scored,
      date: new Date().toISOString(),
      timeTakenSec,
      timeLimitSec,
    };
    setHistory((prev) => [...prev, attempt]);
    recordActivity();
    return attempt;
  };

  return { lastAttempt, history, recordAttempt };
}
