import { useMemo } from "react";
import type { CardState, CardStateMap, Flashcard } from "../types/content";
import { INITIAL_CARD_STATE, isDue, reviewCard } from "../lib/sm2";
import { STORAGE_KEYS } from "../lib/storage";
import { recordActivity } from "../lib/activity";
import { rankHardestCards } from "../lib/hardestCards";
import { useLocalStorage } from "./useLocalStorage";

/** `storageKey` defaults to the flashcard deck's key; image occlusion keeps its own. */
export function useSpacedRepetition(deckId: string, cards: Flashcard[], storageKey = STORAGE_KEYS.cardState(deckId)) {
  const [stateMap, setStateMap] = useLocalStorage<CardStateMap>(storageKey, {});

  const stateFor = (cardId: string): CardState =>
    stateMap[cardId] ?? INITIAL_CARD_STATE;

  const dueCards = useMemo(
    () => cards.filter((card) => isDue(stateFor(card.id))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cards, stateMap],
  );

  const grade = (cardId: string, quality: number) => {
    setStateMap((prev) => ({
      ...prev,
      [cardId]: reviewCard(prev[cardId] ?? INITIAL_CARD_STATE, quality),
    }));
    recordActivity();
  };

  /** Puts a card back to an earlier state (undo); undefined makes it new again. */
  const restore = (cardId: string, state: CardState | undefined) => {
    setStateMap((prev) => {
      const next = { ...prev };
      if (state) next[cardId] = state;
      else delete next[cardId];
      return next;
    });
  };

  const stats = useMemo(() => {
    const total = cards.length;
    const seen = cards.filter((c) => stateMap[c.id]).length;
    const mastered = cards.filter(
      (c) => (stateMap[c.id]?.interval ?? 0) >= 21,
    ).length;
    return { total, seen, mastered, due: dueCards.length };
  }, [cards, stateMap, dueCards.length]);

  const hardestCards = useMemo(
    () => rankHardestCards(cards, stateMap, 5),
    [cards, stateMap],
  );

  return { stateMap, stateFor, dueCards, grade, restore, stats, hardestCards };
}
