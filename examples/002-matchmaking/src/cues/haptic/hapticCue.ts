import type { Vibration } from 'web-haptics';
import { deal } from '../../matching/rng.ts';
import type { Rng } from '../../matching/rng.ts';

/** A vibration at full strength, `delay` ms after the one before it ends. */
const buzz = (duration: number, delay = 0): Vibration => ({ delay, duration, intensity: 1 });

/**
 * The rhythms groups get, chosen to feel nothing alike through someone else's phone, or two phones
 * pressed together: one or two beats, long or short, and one with three. `dots` writes the rhythm
 * out, long beats as dashes.
 */
export const RHYTHMS = {
  heartbeat: { dots: '· ·', name: 'Heartbeat', pattern: [buzz(100), buzz(100, 120)] },
  longBuzz: { dots: '—', name: 'Long buzz', pattern: [buzz(900)] },
  longShort: { dots: '— ·', name: 'Long, short', pattern: [buzz(600), buzz(100, 250)] },
  shortLong: { dots: '· —', name: 'Short, long', pattern: [buzz(100), buzz(600, 250)] },
  tripleTap: { dots: '· · ·', name: 'Triple tap', pattern: [buzz(90), buzz(90, 160), buzz(90, 160)] },
  twoLong: { dots: '— —', name: 'Two long', pattern: [buzz(400), buzz(400, 300)] },
} as const satisfies Record<string, { dots: string; name: string; pattern: ReadonlyArray<Vibration> }>;

export type Rhythm = keyof typeof RHYTHMS;

/**
 * How often every rhythm starts again, in ms: longer than the longest, with a pause after it. It's
 * the same for all of them, so phones can line up on the clock (see `useHapticLoop`).
 */
export const RHYTHM_PERIOD_MS = 2500;

/** How long a rhythm lasts, in ms, from its first buzz to the end of its last. */
export function rhythmLength(rhythm: Rhythm): number {
  return RHYTHMS[rhythm].pattern.reduce((total, { delay, duration }) => total + (delay ?? 0) + duration, 0);
}

/** Every rhythm. */
export const RHYTHM_IDS: ReadonlyArray<Rhythm> = Object.keys(RHYTHMS).filter(isRhythm);

export const RHYTHM_COUNT = RHYTHM_IDS.length;

/** A group's vibration: every phone in the group plays the same rhythm, over and over. */
export interface HapticCue {
  type: 'haptic';
  rhythm: Rhythm;
}

function isRhythm(value: unknown): value is Rhythm {
  return typeof value === 'string' && Object.hasOwn(RHYTHMS, value);
}

/** One rhythm per group, all different while there are enough; past that, they repeat in a new order. */
export function assignHaptics(groupCount: number, rng: Rng): Array<HapticCue> {
  return deal(RHYTHM_IDS, groupCount, rng).map((rhythm) => ({ rhythm, type: 'haptic' }));
}

export function isHapticCue(value: unknown): value is HapticCue {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'haptic' && 'rhythm' in value && isRhythm(value.rhythm);
}
