import type { QuizQuestion } from "../types/content";

function shuffle<T>(items: T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function shuffleOptions(question: QuizQuestion): QuizQuestion {
  const order = shuffle(question.options.map((_, i) => i));
  return {
    ...question,
    options: order.map((i) => question.options[i]),
    answer: order.indexOf(question.answer),
  };
}

/** Fresh per-attempt question and option order, so neither is memorizable across replays. */
export function buildSessionBank(questions: QuizQuestion[]): QuizQuestion[] {
  return shuffle(questions).map(shuffleOptions);
}
