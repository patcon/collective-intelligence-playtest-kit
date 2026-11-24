import type { Vec } from './valence.ts';

/**
 * What someone is doing with the remote:
 * - `arrived`: on the page, at the start screen, not yet tapped in;
 * - `active`: moving the phone, or with a finger on its screen (touch);
 * - `idle`: running, but the phone has barely moved for IDLE_MS (likely put down), or no finger is on it (touch).
 */
export type Activity = 'arrived' | 'active' | 'idle';

export const ACTIVITIES: ReadonlyArray<Activity> = ['arrived', 'active', 'idle'];

/** Tilt that stays within this many degrees counts as still: above a resting phone's sensor noise, below a held one's sway. */
export const STILL_DEG = 2;
/** Still for this long, a tilt remote is idle. */
export const IDLE_MS = 3000;

const RAD = Math.PI / 180;

export function isActivity(value: unknown): value is Activity {
  return ACTIVITIES.some((activity) => activity === value);
}

/** Degrees between two unit vectors. */
function degreesBetween([ax, ay, az]: Vec, [bx, by, bz]: Vec): number {
  const dot = Math.max(-1, Math.min(1, ax * bx + ay * by + az * bz));
  return Math.acos(dot) / RAD;
}

/**
 * Tells active from idle while a remote runs. Feed it each tilt reading (`tilt`) or finger down/up
 * (`touch`), and ask `at(now)`. `poke(now)` counts as a movement, such as the tap that starts it.
 */
export interface ActivityTracker {
  /** A tilt reading; null (no reading) is ignored. */
  tilt: (up: Vec | null, now: number) => void;
  touch: (down: boolean) => void;
  poke: (now: number) => void;
  at: (now: number) => Exclude<Activity, 'arrived'>;
}

export function createActivityTracker(): ActivityTracker {
  let anchor: Vec | null = null;
  let movedAt = Number.NEGATIVE_INFINITY;
  let touching = false;

  return {
    at(now) {
      return touching || now - movedAt < IDLE_MS ? 'active' : 'idle';
    },
    poke(now) {
      movedAt = now;
    },
    tilt(up, now) {
      if (up === null) {
        return;
      }
      if (anchor === null || degreesBetween(anchor, up) > STILL_DEG) {
        anchor = up;
        movedAt = now;
      }
    },
    touch(down) {
      touching = down;
    },
  };
}
