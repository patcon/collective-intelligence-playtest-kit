import type { Vec } from './valence.ts';

/**
 * What someone is doing with the remote:
 * - `arrived`: on the page, at the start screen, not yet tapped in;
 * - `active`: moving the phone, or with a finger on its screen (touch);
 * - `idle`: running, but the phone's tilt has spread less than `stillDeg` over the last `idleMs` (likely
 *   put down), or no finger is on it (touch).
 */
export type Activity = 'arrived' | 'active' | 'idle';

export const ACTIVITIES: ReadonlyArray<Activity> = ['arrived', 'active', 'idle'];

/** When a tilt remote counts as idle. */
export interface IdleSettings {
  /** How far back tilt counts towards its spread (ms): still this long, it's idle. Keep it longer than a breath. */
  idleMs: number;
  /** Tilt whose spread over `idleMs` stays under this many degrees counts as still. */
  stillDeg: number;
}

/**
 * Calibrated on `fixtures/`: a phone on a table spreads at most 0.04° (sensor noise), one pressed
 * to a chest while breathing at least 0.14° over any 4 s, but as little as 0.07° over 3 s.
 */
export const DEFAULT_IDLE: IdleSettings = { idleMs: 4000, stillDeg: 0.1 };

const RAD = Math.PI / 180;

export function isActivity(value: unknown): value is Activity {
  return ACTIVITIES.some((activity) => activity === value);
}

interface Sample {
  t: number;
  up: Vec;
}

/**
 * How far a set of unit vectors spreads, in degrees: the diagonal of the box around them. For
 * small turns that's at least the largest angle between any two, and at most √3 times it.
 */
export function spreadDegrees(ups: ReadonlyArray<Vec>): number {
  let squares = 0;
  for (const axis of [0, 1, 2] as const) {
    const values = ups.map((up) => up[axis]);
    const range = Math.max(...values) - Math.min(...values);
    squares += range * range;
  }
  return ups.length < 2 ? 0 : Math.sqrt(squares) / RAD;
}

/**
 * Tells active from idle while a remote runs. Feed it each tilt reading (`tilt`) or finger down/up
 * (`touch`), and ask `at(now)`. `poke(now)` keeps it active for `idleMs`, as after the tap that starts it.
 */
export interface ActivityTracker {
  /** A tilt reading; null (no reading) is ignored. */
  tilt: (up: Vec | null, now: number) => void;
  touch: (down: boolean) => void;
  poke: (now: number) => void;
  at: (now: number) => Exclude<Activity, 'arrived'>;
}

export function createActivityTracker({ idleMs, stillDeg }: IdleSettings = DEFAULT_IDLE): ActivityTracker {
  let samples: Array<Sample> = [];
  let pokedAt = Number.NEGATIVE_INFINITY;
  let touching = false;

  const recent = (now: number) => {
    samples = samples.filter((sample) => sample.t > now - idleMs);
    return samples.map((sample) => sample.up);
  };

  return {
    at(now) {
      if (touching || now - pokedAt < idleMs) {
        return 'active';
      }
      return spreadDegrees(recent(now)) >= stillDeg ? 'active' : 'idle';
    },
    poke(now) {
      pokedAt = now;
    },
    tilt(up, now) {
      if (up !== null) {
        samples.push({ t: now, up });
        recent(now);
      }
    },
    touch(down) {
      touching = down;
    },
  };
}
