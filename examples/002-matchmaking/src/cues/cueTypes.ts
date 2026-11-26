import type { Rng } from '../matching/rng.ts';
import { assignAvatars, isAvatarCue } from './avatar/avatarCue.ts';
import type { AvatarCue } from './avatar/avatarCue.ts';
import { assignBirdsongs, BIRDSONG_COUNT, isBirdsongCue } from './birdsong/birdsongCue.ts';
import type { BirdsongCue } from './birdsong/birdsongCue.ts';
import { assignColours, isColourCue, PALETTE } from './colour/colourCue.ts';
import type { ColourCue } from './colour/colourCue.ts';

/**
 * What a group is told to look (or listen) for. Each cue type's payload is plain data, so it can go
 * over the socket; `CueView` renders it.
 */
export type Cue = ColourCue | AvatarCue | BirdsongCue;

export type CueTypeId = Cue['type'];

/** One kind of cue, as the room uses it. Kept free of React, so the Worker can import it. */
export interface CueType {
  /** One payload per group, all different up to `maxDistinct`. */
  assign: (groupCount: number, rng: Rng) => Array<Cue>;
  /** How many groups it can tell apart; past this, cues repeat. */
  maxDistinct: number;
}

export const CUE_TYPES: Record<CueTypeId, CueType> = {
  avatar: { assign: assignAvatars, maxDistinct: Number.POSITIVE_INFINITY },
  birdsong: { assign: assignBirdsongs, maxDistinct: BIRDSONG_COUNT },
  colour: { assign: assignColours, maxDistinct: PALETTE.length },
};

export function isCueTypeId(value: unknown): value is CueTypeId {
  return typeof value === 'string' && Object.hasOwn(CUE_TYPES, value);
}

/** One cue per group, of the given type. */
export function assignCues(type: CueTypeId, groupCount: number, rng: Rng): Array<Cue> {
  return CUE_TYPES[type].assign(groupCount, rng);
}

export function isCue(value: unknown): value is Cue {
  return isColourCue(value) || isAvatarCue(value) || isBirdsongCue(value);
}
