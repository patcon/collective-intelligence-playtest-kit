import type { Rng } from '../matching/rng.ts';
import { AVATAR_STYLES, avatarAssigner, isAvatarCue } from './avatar/avatarCue.ts';
import type { AvatarCue } from './avatar/avatarCue.ts';
import { assignBirdsongs, BIRDSONG_COUNT, isBirdsongCue } from './birdsong/birdsongCue.ts';
import type { BirdsongCue } from './birdsong/birdsongCue.ts';
import { assignColours, isColourCue, PALETTE } from './colour/colourCue.ts';
import type { ColourCue } from './colour/colourCue.ts';
import { assignHaptics, isHapticCue, RHYTHM_COUNT } from './haptic/hapticCue.ts';
import type { HapticCue } from './haptic/hapticCue.ts';

/**
 * What a group is told to look (or listen) for. Each cue type's payload is plain data, so it can go
 * over the socket; `CueView` renders it.
 */
export type Cue = ColourCue | AvatarCue | BirdsongCue | HapticCue;

/**
 * The cue types the emcee picks from. Several can send the same kind of payload: every `avatar…`
 * type sends an `avatar` cue, in its own styles.
 */
export type CueTypeId = 'avatarMixed' | 'avatarShapes' | 'avatarThumbs' | 'birdsong' | 'colour' | 'haptic';

/** How a group finds each other with a cue: by ear, by eye, or by touch. */
export type CueSense = 'audio' | 'haptic' | 'visual';

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
  avatarMixed: { assign: avatarAssigner(AVATAR_STYLES), maxDistinct: Number.POSITIVE_INFINITY, name: 'Avatars: Random set', sense: 'visual' },
  avatarShapes: { assign: avatarAssigner(['shapes']), maxDistinct: Number.POSITIVE_INFINITY, name: 'Avatars: Shapes', sense: 'visual' },
  avatarThumbs: { assign: avatarAssigner(['thumbs']), maxDistinct: Number.POSITIVE_INFINITY, name: 'Avatars: Thumbs', sense: 'visual' },
  birdsong: { assign: assignBirdsongs, maxDistinct: BIRDSONG_COUNT, name: 'Birds, sound-only', sense: 'audio' },
  colour: { assign: assignColours, maxDistinct: PALETTE.length, name: 'Colour', sense: 'visual' },
  haptic: { assign: assignHaptics, maxDistinct: RHYTHM_COUNT, name: 'Vibration patterns', sense: 'haptic' },
};

/** Every cue type. */
export const CUE_TYPE_IDS: ReadonlyArray<CueTypeId> = Object.keys(CUE_TYPES).filter(isCueTypeId);

/** Each sense's name for the emcee. */
export const SENSE_NAMES: Record<CueSense, string> = { audio: 'Audio', haptic: 'Haptics', visual: 'Visual' };

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
  return isColourCue(value) || isAvatarCue(value) || isBirdsongCue(value) || isHapticCue(value);
}
