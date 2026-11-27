import { filterCards } from './filterCards.ts';
import type { CardFilters, CardsResponse, Deck, Random } from './types.ts';

export interface DrawOptions extends CardFilters {
  /** At most this many cards; fewer if the pool is smaller. */
  readonly limit: number;
}

/** Draws up to `limit` cards at random from the pool `filters` allow, with no repeats. */
export function drawCards(deck: Deck, { limit, ...filters }: DrawOptions, rng: Random = Math.random): CardsResponse {
  const pool = filterCards(deck, filters);
  const remaining = [...pool];
  const drawn = [];
  while (drawn.length < limit && remaining.length > 0) {
    drawn.push(...remaining.splice(Math.floor(rng() * remaining.length), 1));
  }
  return { cards: drawn, meta: { pool: pool.length, total: deck.length } };
}
