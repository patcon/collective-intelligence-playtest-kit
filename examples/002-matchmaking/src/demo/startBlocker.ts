import { groupCount, MIN_GROUP_SIZE, smallestGroupSize } from '../matching/match.ts';
import type { Grouping } from '../matching/match.ts';

/**
 * Why the emcee can't start matching `ready` people with `grouping`, or null when they can. The room
 * refuses the same starts: anything that would leave someone in a group of one.
 */
export function startBlocker(ready: number, grouping: Grouping): string | null {
  if (ready === 0) {
    return 'No one is ready yet. People join on /participate and tap Start.';
  }
  if (ready < MIN_GROUP_SIZE) {
    return `Only 1 person is ready. Matching needs at least ${MIN_GROUP_SIZE}.`;
  }
  if (smallestGroupSize(ready, grouping) < MIN_GROUP_SIZE) {
    const most = Math.floor(ready / MIN_GROUP_SIZE);
    const choice = most === 1 ? 'Choose 1 group' : `Choose ${most} groups or fewer`;
    return `${ready} people can't make ${groupCount(ready, grouping)} groups without someone on their own. ${choice}.`;
  }
  return null;
}
