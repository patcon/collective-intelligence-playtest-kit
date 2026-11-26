import { random } from './random.ts';
import type { Rng } from './rng.ts';
import { groupSizes } from './split.ts';

export type Algorithm = 'random';

/**
 * How people per group handles people who don't divide evenly: `smart` aims for the average closest
 * to it, `min` makes groups of at least it, `max` groups of at most it. See `groupSizes`.
 */
export type Fit = 'smart' | 'min' | 'max';
export const FITS: ReadonlyArray<Fit> = ['smart', 'min', 'max'];

/** How to split people up: into groups of about `groupSize` people, or into `groupCount` groups. */
export type Grouping = { by: 'groupSize'; groupSize: number; fit: Fit } | { by: 'groupCount'; groupCount: number };

/**
 * Each algorithm orders the ids so that neighbours suit each other; `match` cuts that order into
 * groups, so neighbours end up together. Adding an algorithm is a file that exports one of these,
 * plus a line here.
 */
const ALGORITHMS: Record<Algorithm, (ids: ReadonlyArray<string>, rng: Rng) => Array<string>> = { random };

/**
 * Splits `ids` into groups of exactly the sizes `groupSizes` gives, so a round's groups are the ones
 * the emcee's bar showed. Only called once `startBlocker` allows the start.
 */
export function match(
  ids: ReadonlyArray<string>,
  { algorithm, grouping }: { algorithm: Algorithm; grouping: Grouping },
  rng: Rng,
): Array<Array<string>> {
  const ordered = ALGORITHMS[algorithm](ids, rng);
  const sizes = groupSizes(ordered.length, grouping);
  const starts = sizes.map((_, g) => sizes.slice(0, g).reduce((a, b) => a + b, 0));
  return sizes.map((size, g) => ordered.slice(starts[g], (starts[g] ?? 0) + size));
}
