import { describe, expect, it } from 'vitest';
import { FITS } from './match.ts';
import type { Fit, Grouping } from './match.ts';
import { groupConcerns, groupSizes, MIN_GROUPS, startBlocker } from './split.ts';

const bySize = (groupSize: number, fit: Fit): Grouping => ({ by: 'groupSize', fit, groupSize });
const byCount = (groupCount: number): Grouping => ({ by: 'groupCount', groupCount });

describe('groupSizes', () => {
  it.each([
    [7, bySize(2, 'smart'), [3, 2, 2]],
    [12, bySize(3, 'smart'), [3, 3, 3, 3]],
    [12, bySize(3, 'max'), [3, 3, 3, 3]],
    [12, bySize(3, 'min'), [3, 3, 3, 3]],
    [13, bySize(3, 'max'), [3, 3, 3, 2, 2]],
    [13, bySize(3, 'min'), [4, 3, 3, 3]],
    [20, bySize(15, 'min'), [15, 5]],
    [17, bySize(12, 'min'), [12, 5]],
    [32, bySize(15, 'min'), [16, 16]],
    [0, byCount(3), [0, 0, 0]],
    [3, byCount(2), [2, 1]],
  ])('splits %i people as the spec says', (n, grouping, expected) => {
    expect(groupSizes(n, grouping)).toEqual(expected);
  });

  it('never makes fewer than 2 groups, even with no one ready or a count of 1', () => {
    expect(groupSizes(0, bySize(3, 'smart'))).toEqual([0, 0]);
    expect(groupSizes(5, byCount(1))).toEqual([3, 2]);
  });

  const groupings = [
    ...[2, 3, 4, 5, 6].map(byCount),
    ...[2, 3, 4, 5].flatMap((k) => FITS.map((fit) => bySize(k, fit))),
  ];
  const cases = Array.from({ length: 51 }, (_, n) => groupings.map((grouping) => [n, grouping] as const)).flat();

  it.each(cases)('for %i people by %o: sums to n, at least 2 groups, largest first', (n, grouping) => {
    const sizes = groupSizes(n, grouping);
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(n);
    expect(sizes.length).toBeGreaterThanOrEqual(MIN_GROUPS);
    expect(sizes).toEqual(sizes.toSorted((a, b) => b - a));
  });

  it('never leaves anyone alone under Smart, once there are enough people for two pairs', () => {
    for (let n = 4; n <= 50; n += 1) {
      for (const k of [2, 3, 4, 5]) {
        expect(Math.min(...groupSizes(n, bySize(k, 'smart')))).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('startBlocker', () => {
  const anyCue = Number.POSITIVE_INFINITY;

  it('blocks with no one, or only one person, ready', () => {
    expect(startBlocker(0, bySize(3, 'smart'), anyCue)).toMatch(/No one is ready/);
    expect(startBlocker(1, bySize(3, 'smart'), anyCue)).toMatch(/Only 1 person/);
  });

  it('blocks anyone being on their own, including people for only one group', () => {
    expect(startBlocker(3, byCount(2), anyCue)).toBe("3 people can't make 2 groups without someone on their own.");
    expect(startBlocker(7, byCount(5), anyCue)).toMatch(/on their own/);
    expect(startBlocker(2, bySize(3, 'smart'), anyCue)).toMatch(/on their own/);
  });

  it('blocks more groups than the cue can tell apart', () => {
    expect(startBlocker(20, bySize(2, 'smart'), 8)).toBe('This cue can tell only 8 groups apart, not 10.');
  });

  it('blocks a group short of a Min, until there are people for two full groups', () => {
    expect(startBlocker(17, bySize(12, 'min'), anyCue)).toBe("17 people can't make 2 groups of at least 12.");
    expect(startBlocker(24, bySize(12, 'min'), anyCue)).toBeNull();
  });

  it("allows a small last group under Max, which isn't a minimum", () => {
    expect(startBlocker(13, bySize(3, 'max'), anyCue)).toBeNull();
  });

  it('allows any start where every group has at least two and the cue can tell them apart', () => {
    expect(startBlocker(4, byCount(2), anyCue)).toBeNull();
    expect(startBlocker(5, byCount(2), anyCue)).toBeNull();
    expect(startBlocker(20, bySize(3, 'smart'), 10)).toBeNull();
  });
});

describe('groupConcerns', () => {
  it('flags groups under a pair, short of a Min, or past what the cue can tell apart', () => {
    expect(groupConcerns([2, 1], byCount(2), 10)).toEqual([false, true]);
    expect(groupConcerns([12, 5], bySize(12, 'min'), 10)).toEqual([false, true]);
    expect(groupConcerns([3, 3, 3, 2, 2], bySize(3, 'max'), 10)).toEqual([false, false, false, false, false]);
    expect(groupConcerns([2, 2, 2], bySize(2, 'smart'), 2)).toEqual([false, false, true]);
  });
});
