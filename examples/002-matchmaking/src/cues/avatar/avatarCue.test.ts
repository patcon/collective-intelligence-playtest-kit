import { describe, expect, it } from 'vitest';
import { seededRng } from '../../matching/rng.ts';
import { AVATAR_STYLES, assignAvatars, isAvatarCue } from './avatarCue.ts';

describe('assignAvatars', () => {
  it('gives every group a different avatar, however many groups there are', () => {
    const avatars = assignAvatars(50, seededRng(1));
    expect(new Set(avatars.map((a) => `${a.style}/${a.seed}`)).size).toBe(50);
  });

  it('alternates styles, so neighbouring groups look different', () => {
    const [first, second] = assignAvatars(2, seededRng(1));
    expect(first?.style).not.toBe(second?.style);
  });

  it('can start on any style, so a one-group round is not always the same one', () => {
    const styles = new Set(Array.from({ length: 20 }, (_, seed) => assignAvatars(1, seededRng(seed))[0]?.style));
    expect(styles.size).toBe(AVATAR_STYLES.length);
  });

  it('gives different seeds in different rounds', () => {
    expect(assignAvatars(1, seededRng(1))).not.toEqual(assignAvatars(1, seededRng(2)));
  });
});

describe('isAvatarCue', () => {
  it('accepts an assigned avatar, and rejects an unknown style or an overlong seed', () => {
    const [avatar] = assignAvatars(1, seededRng(1));
    expect(isAvatarCue(avatar)).toBe(true);
    expect(isAvatarCue({ ...avatar, style: 'robots' })).toBe(false);
    expect(isAvatarCue({ ...avatar, seed: 'x'.repeat(100) })).toBe(false);
  });
});
