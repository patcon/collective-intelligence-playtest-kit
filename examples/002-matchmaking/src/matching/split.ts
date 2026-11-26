import type { Fit, Grouping } from './match.ts';

/** No one is matched into a group smaller than this: a group of one has no one to find. */
export const MIN_GROUP_SIZE = 2;

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

/** The people per group a Min asks for, or null when no group has a minimum beyond `MIN_GROUP_SIZE`. */
function minimumOf(grouping: Grouping): number | null {
  return grouping.by === 'groupSize' && grouping.fit === 'min' ? grouping.groupSize : null;
}

/**
 * Why `ready` people can't start with `grouping` under a cue that tells `maxDistinct` groups apart, or
 * null when they can. The emcee's Start and the room's reducer both use it, so they never disagree.
 */
export function startBlocker(ready: number, grouping: Grouping, maxDistinct: number): string | null {
  if (ready === 0) {
    return 'No one is ready yet. People join on /participate and tap Start.';
  }
  if (ready < MIN_GROUP_SIZE) {
    return `Only 1 person is ready. Matching needs at least ${MIN_GROUP_SIZE}.`;
  }
  const sizes = groupSizes(ready, grouping);
  const smallest = Math.min(...sizes);
  if (smallest < MIN_GROUP_SIZE) {
    return `${ready} people can't make ${sizes.length} groups without someone on their own.`;
  }
  if (sizes.length > maxDistinct) {
    return `This cue can tell only ${maxDistinct} groups apart, not ${sizes.length}.`;
  }
  const minimum = minimumOf(grouping);
  if (minimum !== null && smallest < minimum) {
    return `${ready} people can't make ${sizes.length} groups of at least ${minimum}.`;
  }
  return null;
}

/** For each group in `sizes`, whether it's a concern (shown orange): someone alone, short of a Min, or past what the cue can tell apart. */
export function groupConcerns(sizes: ReadonlyArray<number>, grouping: Grouping, maxDistinct: number): Array<boolean> {
  const floor = Math.max(MIN_GROUP_SIZE, minimumOf(grouping) ?? 0);
  return sizes.map((size, i) => size < floor || i >= maxDistinct);
}
