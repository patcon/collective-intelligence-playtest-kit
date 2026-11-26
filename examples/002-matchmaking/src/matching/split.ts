import { MIN_GROUP_SIZE } from './match.ts';
import type { Fit, Grouping } from './match.ts';

/** Fewest groups a split ever has: one group isn't a split. */
export const MIN_GROUPS = 2;

/** `n` people dealt as evenly as possible into `groups`, largest first. */
function evenSizes(n: number, groups: number): Array<number> {
  return Array.from({ length: groups }, (_, g) => Math.floor(n / groups) + (g < n % groups ? 1 : 0));
}

/** Smart: the group count whose average is closest to `k`, never leaving anyone alone. A tie goes to more, smaller groups. */
function smartCount(n: number, k: number): number {
  const fewer = Math.floor(n / k);
  const more = Math.ceil(n / k);
  if (more > 0 && Math.floor(n / more) < MIN_GROUP_SIZE) {
    return fewer;
  }
  return fewer > 0 && Math.abs(n / fewer - k) < Math.abs(n / more - k) ? fewer : more;
}

/** How many groups `n` people make at `k` per group, for each fit, before the floor of `MIN_GROUPS`. */
const COUNT_FOR_FIT: Record<Fit, (n: number, k: number) => number> = {
  max: (n, k) => Math.ceil(n / k),
  min: (n, k) => Math.floor(n / k),
  smart: smartCount,
};

/**
 * The group sizes `n` people make, largest first: the one split that the emcee's bar shows, Start
 * checks and the matcher deals. Always at least `MIN_GROUPS` groups, even with no one ready. Min with
 * people for only one full group fills it and leaves the rest short (20 at 15 is 15·5), to show how
 * many are missing.
 */
export function groupSizes(n: number, grouping: Grouping): Array<number> {
  if (grouping.by === 'groupCount') {
    return evenSizes(n, Math.max(MIN_GROUPS, grouping.groupCount));
  }
  const { fit, groupSize } = grouping;
  const groups = COUNT_FOR_FIT[fit](n, groupSize);
  if (fit === 'min' && groups === 1 && n > groupSize) {
    return [groupSize, n - groupSize];
  }
  return evenSizes(n, Math.max(MIN_GROUPS, groups));
}
