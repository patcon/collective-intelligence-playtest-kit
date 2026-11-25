import type { Rng } from '../matching/rng.ts';
import { assignColours, isColourCue, PALETTE } from './colour/colourCue.ts';
import type { ColourCue } from './colour/colourCue.ts';

/**
 * What a group is told to look (or listen) for. Each cue type's payload is plain data, so it can go
 * over the socket; `CueView` renders it.
 */
export type Cue = ColourCue;

export type CueTypeId = Cue['type'];

/** One kind of cue, as the room uses it. Kept free of React, so the Worker can import it. */
export interface CueType {
  /** One payload per group, all different up to `maxDistinct`. */
  assign: (groupCount: number, rng: Rng) => Array<Cue>;
  /** How many groups it can tell apart; past this, cues repeat. */
  maxDistinct: number;
}

export const CUE_TYPES: Record<CueTypeId, CueType> = {
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
  return isColourCue(value);
}
