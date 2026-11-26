import { CUE_TYPES, cueLabel } from '../cues/cueTypes.ts';
import { groupSizes } from '../matching/split.ts';
import type { RoomSnapshot } from '../room/protocol.ts';
import { progressOf } from './progressOf.ts';


/**
 * Why some groups will share a cue next round, or null when every group can have its own: the
 * config's grouping, over everyone ready, makes more groups than the cue type can tell apart.
 */
export function repeatWarning(snapshot: RoomSnapshot): string | null {
  const { cue, grouping } = snapshot.config;
  const groups = groupSizes(progressOf(snapshot).nextRound, grouping).length;
  const { maxDistinct } = CUE_TYPES[cue];
  return groups > maxDistinct ? `${groups} groups, but ${cueLabel(cue)} can only tell ${maxDistinct} apart, so some groups will share a cue.` : null;
}
