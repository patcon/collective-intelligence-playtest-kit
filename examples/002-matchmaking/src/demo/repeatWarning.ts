import { CUE_TYPES } from '../cues/cueTypes.ts';
import { groupCount } from '../matching/match.ts';
import type { RoomSnapshot } from '../room/protocol.ts';

/** Everyone the next Start would match: past the start screen, whether waiting, late or in this round. */
function nextRoundSize(snapshot: RoomSnapshot): number {
  return snapshot.participants.filter((p) => p.status !== 'joined').length;
}

/**
 * Why some groups will share a cue next round, or null when every group can have its own: the
 * config's grouping, over everyone ready, makes more groups than the cue type can tell apart.
 */
export function repeatWarning(snapshot: RoomSnapshot): string | null {
  const { cue, grouping } = snapshot.config;
  const groups = groupCount(nextRoundSize(snapshot), grouping);
  const { maxDistinct } = CUE_TYPES[cue];
  return groups > maxDistinct
    ? `${groups} groups, but only ${maxDistinct} different ${cue} cues: some groups will share one.`
    : null;
}
