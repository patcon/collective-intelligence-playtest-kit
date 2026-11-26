import type { Rng } from '../../matching/rng.ts';

/** The DiceBear styles a group can get. Both are CC0 and colourful, so they're easy to spot across a room. */
export const AVATAR_STYLES = ['thumbs', 'shapes'] as const;

export type AvatarStyle = (typeof AVATAR_STYLES)[number];

/** A group's avatar: drawn on each phone from its style and seed, so nothing is fetched. */
export interface AvatarCue {
  type: 'avatar';
  style: AvatarStyle;
  seed: string;
}

/** Seeds are as long as this, at most; enough to never repeat in a round. */
const MAX_SEED_LENGTH = 32;

/**
 * Assigns one avatar per group, in the given styles. Seeds carry the group's number, so no two in a
 * round are the same, and a random part, so rounds differ. With more than one style, groups take
 * them in turn, so neighbouring groups look nothing alike, starting at a random one, so a round with
 * few groups can show any of them.
 */
export function avatarAssigner(styles: readonly [AvatarStyle, ...Array<AvatarStyle>]) {
  return (groupCount: number, rng: Rng): Array<AvatarCue> => {
    const round = Math.floor(rng() * 1_000_000).toString(36);
    const firstStyle = Math.floor(rng() * styles.length);
    return Array.from({ length: groupCount }, (_, g) => ({
      seed: `${round}-${g}`,
      style: styles[(firstStyle + g) % styles.length] ?? styles[0],
      type: 'avatar',
    }));
  };
}

function isAvatarStyle(value: unknown): value is AvatarStyle {
  return AVATAR_STYLES.some((style) => style === value);
}

export function isAvatarCue(value: unknown): value is AvatarCue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'avatar' &&
    'style' in value &&
    isAvatarStyle(value.style) &&
    'seed' in value &&
    typeof value.seed === 'string' &&
    value.seed.length <= MAX_SEED_LENGTH
  );
}
