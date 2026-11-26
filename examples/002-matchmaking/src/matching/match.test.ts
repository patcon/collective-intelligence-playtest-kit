import { describe, expect, it } from 'vitest';
import { FITS, match } from './match.ts';
import type { Grouping } from './match.ts';
import { seededRng } from './rng.ts';
import { groupSizes } from './split.ts';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);

function sizes(n: number, grouping: Grouping): Array<number> {
  return match(ids(n), { algorithm: 'random', grouping }, seededRng(1))
    .map((group) => group.length)
    .toSorted((a, b) => b - a);
}

describe('match', () => {
  it('makes 10 groups of 2 from 20 people by size 2', () => {
    expect(sizes(20, { by: 'groupSize', fit: 'smart', groupSize: 2 })).toEqual(Array.from({ length: 10 }, () => 2));
  });

  it('makes 20 by size 3 Smart into six groups of 3 and one of 2', () => {
    expect(sizes(20, { by: 'groupSize', fit: 'smart', groupSize: 3 })).toEqual([3, 3, 3, 3, 3, 3, 2]);
  });

  it('makes 4 groups of 5 from 20 people by count 4', () => {
    expect(sizes(20, { by: 'groupCount', groupCount: 4 })).toEqual([5, 5, 5, 5]);
  });

  it('fills groups first under Min: 32 at 15 is 16·16, and 20 at 15 is 15·5', () => {
    expect(sizes(32, { by: 'groupSize', fit: 'min', groupSize: 15 })).toEqual([16, 16]);
    expect(sizes(20, { by: 'groupSize', fit: 'min', groupSize: 15 })).toEqual([15, 5]);
  });

  const groupings: Array<Grouping> = [
    ...[2, 3, 4, 5, 6].map((groupCount): Grouping => ({ by: 'groupCount', groupCount })),
    ...[2, 3, 4, 5].flatMap((groupSize) => FITS.map((fit): Grouping => ({ by: 'groupSize', fit, groupSize }))),
  ];

  it('deals exactly the sizes groupSizes gives, for every headcount up to 50', () => {
    for (let n = 2; n <= 50; n += 1) {
      for (const grouping of groupings) {
        const groups = match(ids(n), { algorithm: 'random', grouping }, seededRng(n));
        expect(groups.map((g) => g.length)).toEqual(groupSizes(n, grouping));
      }
    }
  });

  it('places everyone exactly once', () => {
    const groups = match(ids(17), { algorithm: 'random', grouping: { by: 'groupSize', fit: 'smart', groupSize: 4 } }, seededRng(7));
    expect(groups.flat().toSorted()).toEqual(ids(17).toSorted());
  });

  it('gives the same groups for the same seed, and different groups for another', () => {
    const config = { algorithm: 'random', grouping: { by: 'groupSize', fit: 'smart', groupSize: 2 } } as const;
    expect(match(ids(10), config, seededRng(3))).toEqual(match(ids(10), config, seededRng(3)));
    expect(match(ids(10), config, seededRng(3))).not.toEqual(match(ids(10), config, seededRng(4)));
  });
});
