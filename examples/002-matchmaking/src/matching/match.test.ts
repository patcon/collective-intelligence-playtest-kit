import { describe, expect, it } from 'vitest';
import { match, smallestGroupSize } from './match.ts';
import type { Grouping } from './match.ts';
import { seededRng } from './rng.ts';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);

function sizes(n: number, grouping: Grouping): Array<number> {
  return match(ids(n), { algorithm: 'random', grouping }, seededRng(1))
    .map((group) => group.length)
    .toSorted((a, b) => b - a);
}

describe('match', () => {
  it('makes 10 groups of 2 from 20 people by size 2', () => {
    expect(sizes(20, { by: 'groupSize', groupSize: 2 })).toEqual(Array.from({ length: 10 }, () => 2));
  });

  it('spreads leftovers one per group: 20 by size 3 is two groups of 4 and four of 3', () => {
    expect(sizes(20, { by: 'groupSize', groupSize: 3 })).toEqual([4, 4, 3, 3, 3, 3]);
  });

  it('makes 4 groups of 5 from 20 people by count 4', () => {
    expect(sizes(20, { by: 'groupCount', groupCount: 4 })).toEqual([5, 5, 5, 5]);
  });

  it('keeps sizes within one of each other by count', () => {
    expect(sizes(11, { by: 'groupCount', groupCount: 3 })).toEqual([4, 4, 3]);
  });

  it('puts everyone in one group when there are fewer people than the size', () => {
    expect(sizes(2, { by: 'groupSize', groupSize: 3 })).toEqual([2]);
  });

  it('makes no more groups than people by count', () => {
    expect(sizes(2, { by: 'groupCount', groupCount: 5 })).toEqual([1, 1]);
  });

  it('knows the smallest group it will make', () => {
    expect(smallestGroupSize(0, { by: 'groupSize', groupSize: 3 })).toBe(0);
    expect(smallestGroupSize(1, { by: 'groupSize', groupSize: 3 })).toBe(1);
    expect(smallestGroupSize(20, { by: 'groupSize', groupSize: 3 })).toBe(3);
    expect(smallestGroupSize(3, { by: 'groupCount', groupCount: 2 })).toBe(1);
    expect(smallestGroupSize(20, { by: 'groupCount', groupCount: 4 })).toBe(5);
  });

  it('makes no groups from no one, and one group of one from one person', () => {
    expect(match([], { algorithm: 'random', grouping: { by: 'groupSize', groupSize: 2 } }, seededRng(1))).toEqual([]);
    expect(match(['a'], { algorithm: 'random', grouping: { by: 'groupCount', groupCount: 3 } }, seededRng(1))).toEqual([['a']]);
  });

  it('places everyone exactly once', () => {
    const groups = match(ids(17), { algorithm: 'random', grouping: { by: 'groupSize', groupSize: 4 } }, seededRng(7));
    expect(groups.flat().toSorted()).toEqual(ids(17).toSorted());
  });

  it('gives the same groups for the same seed, and different groups for another', () => {
    const config = { algorithm: 'random', grouping: { by: 'groupSize', groupSize: 2 } } as const;
    expect(match(ids(10), config, seededRng(3))).toEqual(match(ids(10), config, seededRng(3)));
    expect(match(ids(10), config, seededRng(3))).not.toEqual(match(ids(10), config, seededRng(4)));
  });
});
