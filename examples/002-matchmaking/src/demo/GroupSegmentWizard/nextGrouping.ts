import { FITS } from '../../matching/match.ts';
import type { Fit, Grouping } from '../../matching/match.ts';
import { groupSizes, MIN_GROUP_SIZE, MIN_GROUPS } from '../../matching/split.ts';
import { MAX_GROUPING } from '../../room/matchConfig.ts';

/** What the emcee can do in `GroupSegmentWizard`: step the number they set, switch which number that is, or cycle the fit. */
export type WizardAction = 'fewer' | 'more' | 'switch' | 'cycleFit';

/** The number the emcee sets, and the lowest it goes. */
function setNumber(grouping: Grouping): { value: number; floor: number } {
  return grouping.by === 'groupSize' ? { floor: MIN_GROUP_SIZE, value: grouping.groupSize } : { floor: MIN_GROUPS, value: grouping.groupCount };
}

/** Whether −/+ can move the number the emcee sets. Only 2 and `MAX_GROUPING` stop it, never the people ready. */
export function canStep(grouping: Grouping, delta: 1 | -1): boolean {
  const { value, floor } = setNumber(grouping);
  return value + delta >= floor && value + delta <= MAX_GROUPING;
}

function stepped(grouping: Grouping, delta: 1 | -1): Grouping {
  if (!canStep(grouping, delta)) {
    return grouping;
  }
  return grouping.by === 'groupSize' ? { ...grouping, groupSize: grouping.groupSize + delta } : { ...grouping, groupCount: grouping.groupCount + delta };
}

/** Every people-per-group number the room accepts, nearest to `average` first (a tie goes to the smaller). */
function sizesNearest(average: number): Array<number> {
  const all = Array.from({ length: MAX_GROUPING - MIN_GROUP_SIZE + 1 }, (_, i) => MIN_GROUP_SIZE + i);
  return all.toSorted((a, b) => Math.abs(a - average) - Math.abs(b - average) || a - b);
}

/**
 * The other way of setting the same split. To groups, the split's group count, which keeps any even
 * split (Min's short `15·5` becomes `10·10`). To people per group, with `fit`, the size nearest the
 * average group that makes the same split; when none can (12 in 5 groups), the nearest size.
 */
function switched(grouping: Grouping, ready: number, fit: Fit): Grouping {
  const sizes = groupSizes(ready, grouping);
  if (grouping.by === 'groupSize') {
    return { by: 'groupCount', groupCount: sizes.length };
  }
  const nearest = sizesNearest(ready / sizes.length);
  const keeps = nearest.find((groupSize) => groupSizes(ready, { by: 'groupSize', fit, groupSize }).join() === sizes.join());
  return { by: 'groupSize', fit, groupSize: keeps ?? nearest[0] ?? MIN_GROUP_SIZE };
}

function cycled(grouping: Grouping): Grouping {
  if (grouping.by !== 'groupSize') {
    return grouping;
  }
  return { ...grouping, fit: FITS[(FITS.indexOf(grouping.fit) + 1) % FITS.length] ?? 'smart' };
}

/**
 * The grouping after `action`, with `ready` people ready. `fit` is the one to use on switching to
 * people per group: the last one chosen, which the caller remembers while groups are set.
 */
export function nextGrouping(grouping: Grouping, action: WizardAction, ready: number, fit: Fit): Grouping {
  switch (action) {
    case 'fewer':
      return stepped(grouping, -1);
    case 'more':
      return stepped(grouping, 1);
    case 'switch':
      return switched(grouping, ready, fit);
    case 'cycleFit':
      return cycled(grouping);
  }
}
