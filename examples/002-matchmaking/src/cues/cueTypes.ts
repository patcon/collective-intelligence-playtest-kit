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

/** How a group finds each other with a cue: by ear or by eye. */
export type CueSense = 'audio' | 'visual';

/** One kind of cue, as the room uses it. Kept free of React, so the Worker can import it. */
export interface CueType {
  /** One payload per group, all different up to `maxDistinct`. */
  assign: (groupCount: number, rng: Rng) => Array<Cue>;
  /** How many groups it can tell apart; past this, cues repeat. */
  maxDistinct: number;
  sense: CueSense;
  /** Its name for the emcee, after the sense: "Birds, sound-only". */
  name: string;
}

export const CUE_TYPES: Record<CueTypeId, CueType> = {
  avatar: { assign: assignAvatars, maxDistinct: Number.POSITIVE_INFINITY, name: 'Avatars', sense: 'visual' },
  birdsong: { assign: assignBirdsongs, maxDistinct: BIRDSONG_COUNT, name: 'Birds, sound-only', sense: 'audio' },
  colour: { assign: assignColours, maxDistinct: PALETTE.length, name: 'Colour', sense: 'visual' },
};

/** Every cue type. */
export const CUE_TYPE_IDS: ReadonlyArray<CueTypeId> = Object.keys(CUE_TYPES).filter(isCueTypeId);

const SENSE_NAMES: Record<CueSense, string> = { audio: 'Audio', visual: 'Visual' };

/** A cue type's name for the emcee, led by its sense: "Audio: Birds, sound-only". */
export function cueLabel(type: CueTypeId): string {
  const { name, sense } = CUE_TYPES[type];
  return `${SENSE_NAMES[sense]}: ${name}`;
}

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
