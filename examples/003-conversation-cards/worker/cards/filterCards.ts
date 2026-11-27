import type { Card, CardFilters, Deck } from './types.ts';

/** The pool `filters` allow from `deck`, in deck order. Unknown ids in `ids` or `exclude` match nothing. */
export function filterCards(deck: Deck, { type, ids, exclude }: CardFilters): Array<Card> {
  const chosen = ids && new Set(ids);
  const excluded = new Set(exclude);
  return deck.filter(
    (card) =>
      (type === undefined || card.type === type) && (!chosen || chosen.has(card.id)) && !excluded.has(card.id),
  );
}
