import { random } from './random.ts';
import type { Rng } from './rng.ts';

export type Algorithm = 'random';

/** How to split people up: into groups of about `size`, or into `count` groups. */
export type Grouping = { by: 'size'; size: number } | { by: 'count'; count: number };

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
  return grouping.by === 'size' ? Math.max(1, Math.floor(n / grouping.size)) : Math.min(grouping.count, n);
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
