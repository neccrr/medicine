import { useMemo } from "react";
import type { CardState, CardStateMap, Flashcard } from "../types/content";
import { INITIAL_CARD_STATE, isDue, reviewCard } from "../lib/sm2";
import { STORAGE_KEYS } from "../lib/storage";
import { recordActivity } from "../lib/activity";
import { useLocalStorage } from "./useLocalStorage";

export function useSpacedRepetition(deckId: string, cards: Flashcard[]) {
  const [stateMap, setStateMap] = useLocalStorage<CardStateMap>(
    STORAGE_KEYS.cardState(deckId),
    {},
  );

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

  const stats = useMemo(() => {
    const total = cards.length;
    const seen = cards.filter((c) => stateMap[c.id]).length;
    const mastered = cards.filter(
      (c) => (stateMap[c.id]?.interval ?? 0) >= 21,
    ).length;
    return { total, seen, mastered, due: dueCards.length };
  }, [cards, stateMap, dueCards.length]);

  const hardestCards = useMemo(
    () =>
      cards
        .filter((c) => (stateMap[c.id]?.lapses ?? 0) > 0)
        .sort((a, b) => {
          const lapseDiff =
            (stateMap[b.id]?.lapses ?? 0) - (stateMap[a.id]?.lapses ?? 0);
          if (lapseDiff !== 0) return lapseDiff;
          return (
            (stateMap[a.id]?.easeFactor ?? 2.5) -
            (stateMap[b.id]?.easeFactor ?? 2.5)
          );
        })
        .slice(0, 5),
    [cards, stateMap],
  );

  return { stateFor, dueCards, grade, stats, hardestCards };
}
