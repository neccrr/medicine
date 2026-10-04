import { readJSON, STORAGE_KEYS } from "../storage";
import { MASTERED_DAYS } from "../readiness";
import type { CardStateMap, QuizAttempt } from "../../types/content";
import type { GraphNode } from "./types";

// How well the student knows each concept on the map, from the cards, quiz questions and
// labelled figures that mention it: 0–1, or null when they haven't studied any of them yet.

export interface StudyState {
  cards: Partial<Record<string, CardStateMap>>;
  labels: Partial<Record<string, CardStateMap>>;
  /** Per subject: questions missed in the latest attempts, and whether the quiz was ever taken. */
  quiz: Partial<Record<string, { missed: Set<string>; taken: boolean }>>;
}

export function readStudyState(subjects: string[]): StudyState {
  const state: StudyState = { cards: {}, labels: {}, quiz: {} };
  for (const key of subjects) {
    state.cards[key] = readJSON<CardStateMap>(STORAGE_KEYS.cardState(key), {});
    state.labels[key] = readJSON<CardStateMap>(STORAGE_KEYS.occlusionState(key), {});
    const attempts = readJSON<QuizAttempt[]>(STORAGE_KEYS.quizProgress(key), []);
    state.quiz[key] = { missed: new Set(attempts.slice(-3).flatMap((a) => a.missedIds)), taken: attempts.length > 0 };
  }
  return state;
}

const strength = (s: { interval?: number } | undefined) => Math.min(1, (s?.interval ?? 0) / MASTERED_DAYS);

export function nodeMastery(node: GraphNode, state: StudyState): number | null {
  let sum = 0;
  let n = 0;
  for (const [subject, ids] of Object.entries(node.cards)) {
    for (const id of ids) {
      const s = state.cards[subject]?.[id];
      if (s) {
        sum += strength(s);
        n += 1;
      }
    }
  }
  for (const [subject, ids] of Object.entries(node.labels)) {
    for (const id of ids) {
      const s = state.labels[subject]?.[id];
      if (s) {
        sum += strength(s);
        n += 1;
      }
    }
  }
  // A question counts once its subject's quiz has been taken: right unless recently missed.
  for (const [subject, ids] of Object.entries(node.questions)) {
    const q = state.quiz[subject];
    if (!q?.taken) continue;
    for (const id of ids) {
      sum += q.missed.has(id) ? 0 : 1;
      n += 1;
    }
  }
  return n > 0 ? sum / n : null;
}
