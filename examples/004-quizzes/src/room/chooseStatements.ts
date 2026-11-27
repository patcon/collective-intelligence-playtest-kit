import { TRAITS } from '../items/items.ts';
import type { Item, ItemId } from '../items/items.ts';
import { shuffle } from './rng.ts';
import type { Rng } from './rng.ts';

/**
 * `count` statements spread as evenly across the traits as they go: `floor(count / 5)` from each, and one
 * more from each of `count mod 5` traits picked at random. Random within a trait, then back in the test's
 * order (the order of `items`).
 */
export function chooseStatements(items: ReadonlyArray<Item>, count: number, rng: Rng): Array<ItemId> {
  const perTrait = Math.floor(count / TRAITS.length);
  const extra = new Set(shuffle(TRAITS, rng).slice(0, count % TRAITS.length));
  const chosen = new Set(
    TRAITS.flatMap((trait) => {
      const pool = shuffle(
        items.filter((item) => item.trait === trait),
        rng,
      );
      return pool.slice(0, perTrait + (extra.has(trait) ? 1 : 0));
    }),
  );
  return items.flatMap((item) => (chosen.has(item) ? [item.id] : []));
}
