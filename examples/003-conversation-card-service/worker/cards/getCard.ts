import type { Card, Deck } from './types.ts';

/** The card with `id`, or `undefined` if the deck has none. */
export function getCard(deck: Deck, id: string): Card | undefined {
  return deck.find((card) => card.id === id);
}
