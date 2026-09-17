export interface Flashcard {
  id: string;
  front: string;
  back: string;
  tags: string[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
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

export interface Subject {
  id: string;
  label: string;
}

export interface EbookChapterMeta {
  id: string;
  title: string;
}

export interface EbookMeta {
  title: string;
  description: string;
  chapters: EbookChapterMeta[];
}

export interface ReadingPosition {
  chapterId: string;
  scroll: number;
  updatedAt: string;
}

