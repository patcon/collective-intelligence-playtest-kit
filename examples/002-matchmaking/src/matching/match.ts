import { random } from './random.ts';
import type { Rng } from './rng.ts';

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
 * Each algorithm orders the ids so that neighbours suit each other; `match` deals them out from there.
 * Adding an algorithm is a file that exports one of these, plus a line here.
 */
const ALGORITHMS: Record<Algorithm, (ids: ReadonlyArray<string>, rng: Rng) => Array<string>> = { random };

/**
 * How many groups `n` people make. By size `k`, `floor(n / k)`, and at least one; by count `c`, no
 * more groups than people. No people, no groups.
 */
export function groupCount(n: number, grouping: Grouping): number {
  if (n === 0) {
    return 0;
  }
  return grouping.by === 'groupSize' ? Math.max(1, Math.floor(n / grouping.groupSize)) : Math.min(grouping.groupCount, n);
}

/** No one is matched into a group smaller than this: a group of one has no one to find. */
export const MIN_GROUP_SIZE = 2;

/** The size of the smallest group `n` people make (sizes differ by at most one), or 0 with no people. */
export function smallestGroupSize(n: number, grouping: Grouping): number {
  return n === 0 ? 0 : Math.floor(n / groupCount(n, grouping));
}

/**
 * Splits `ids` into groups as `grouping` asks. Dealt round-robin, so sizes differ by at most one:
 * by size, leftovers join existing groups one each.
 */
export function match(
  ids: ReadonlyArray<string>,
  { algorithm, grouping }: { algorithm: Algorithm; grouping: Grouping },
  rng: Rng,
): Array<Array<string>> {
  const ordered = ALGORITHMS[algorithm](ids, rng);
  const count = groupCount(ordered.length, grouping);
  return Array.from({ length: count }, (_, g) => ordered.filter((_, i) => i % count === g));
}
