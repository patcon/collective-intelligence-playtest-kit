import { describe, expect, it } from 'vitest';
import { FITS } from '../../matching/match.ts';
import type { Fit, Grouping } from '../../matching/match.ts';
import { groupSizes } from '../../matching/split.ts';
import { MAX_GROUPING } from '../../room/matchConfig.ts';
import { canStep, nextGrouping } from './nextGrouping.ts';

const bySize = (groupSize: number, fit: Fit = 'smart'): Grouping => ({ by: 'groupSize', fit, groupSize });
const byCount = (groupCount: number): Grouping => ({ by: 'groupCount', groupCount });

describe('nextGrouping', () => {
  it('steps the number the emcee sets', () => {
    expect(nextGrouping(byCount(3), 'more', 0, 'smart')).toEqual(byCount(4));
    expect(nextGrouping(bySize(3, 'max'), 'fewer', 0, 'smart')).toEqual(bySize(2, 'max'));
  });

  it('stops only at 2 and at the most the room accepts, whoever is ready', () => {
    expect(canStep(byCount(2), -1)).toBe(false);
    expect(canStep(bySize(2), -1)).toBe(false);
    expect(nextGrouping(byCount(2), 'fewer', 50, 'smart')).toEqual(byCount(2));
    expect(canStep(bySize(MAX_GROUPING), 1)).toBe(false);
    expect(canStep(byCount(30), 1)).toBe(true);
    expect(canStep(byCount(30), -1)).toBe(true);
  });

  it('keeps the number of groups on switching to groups, and any even split', () => {
    for (let n = 0; n <= 50; n += 1) {
      for (const grouping of [2, 3, 4, 5].flatMap((k) => FITS.map((fit) => bySize(k, fit)))) {
        const before = groupSizes(n, grouping);
        const after = groupSizes(n, nextGrouping(grouping, 'switch', n, 'smart'));
        expect(after).toHaveLength(before.length);
        if (Math.max(...before) - Math.min(...before) <= 1) {
          expect(after).toEqual(before);
        }
      }
    }
  });

  it('keeps the split on switching to people per group, whenever a size can make it', () => {
    expect(nextGrouping(byCount(7), 'switch', 20, 'smart')).toEqual(bySize(3));
    expect(nextGrouping(byCount(2), 'switch', 20, 'min')).toEqual(bySize(10, 'min'));
    for (let n = 0; n <= 50; n += 1) {
      for (const groupCount of [2, 3, 4, 5, 6]) {
        const after = nextGrouping(byCount(groupCount), 'switch', n, 'smart');
        const reachable = Array.from({ length: MAX_GROUPING - 1 }, (_, i) => groupSizes(n, bySize(i + 2)).join());
        if (reachable.includes(groupSizes(n, byCount(groupCount)).join())) {
          expect(groupSizes(n, after)).toEqual(groupSizes(n, byCount(groupCount)));
        }
      }
    }
  });

  it("picks the nearest size when no size makes the split: 12 in 5 groups can't be kept", () => {
    expect(nextGrouping(byCount(5), 'switch', 12, 'smart')).toEqual(bySize(2));
  });

  it('cycles the fit Smart → Min → Max → Smart, only while people per group is set', () => {
    const min = nextGrouping(bySize(3), 'cycleFit', 0, 'smart');
    const max = nextGrouping(min, 'cycleFit', 0, 'smart');
    expect([min, max, nextGrouping(max, 'cycleFit', 0, 'smart')]).toEqual([bySize(3, 'min'), bySize(3, 'max'), bySize(3, 'smart')]);
    expect(nextGrouping(byCount(3), 'cycleFit', 0, 'smart')).toEqual(byCount(3));
  });

  it('switches back to people per group with the fit it is given', () => {
    expect(nextGrouping(byCount(4), 'switch', 0, 'max')).toMatchObject({ fit: 'max' });
  });
});
