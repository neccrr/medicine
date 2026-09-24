export interface Flashcard {
  id: string;
  front: string;
  back: string;
  tags: string[];
  image?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  image?: string;
}

export interface CardState {
  interval: number;
  easeFactor: number;
  dueDate: string;
  reps: number;
  lapses: number;
}

export type CardStateMap = Record<string, CardState>;

export interface QuizAttempt {
  score: number;
  total: number;
  date: string;
  missedIds: string[];
}

export interface ExamAttempt extends QuizAttempt {
  timeTakenSec: number;
  timeLimitSec: number;
}

export interface Subject {
  id: string;
  label: string;
  /** Study block whose content folder this subject's material lives in, e.g. "1.1". */
  blockId: string;
}

export interface EbookChapterMeta {
  id: string;
  title: string;
}

export interface EbookResource {
  title: string;
  url: string;
}

export interface EbookMeta {
  title: string;
  description: string;
  chapters: EbookChapterMeta[];
  resources?: EbookResource[];
}

export interface ReadingPosition {
  chapterId: string;
  scroll: number;
  updatedAt: string;
}

