/** A direction in the phone's own axes: x to its right edge, y to its top, z out of its screen. */
export type Vec = [number, number, number];

/** How a phone reads as valence: which way it turns, or where a finger is on its screen. */
export type Detection = 'flip' | 'invert' | 'spin' | 'touch';

export const DETECTIONS: ReadonlyArray<Detection> = ['flip', 'invert', 'spin', 'touch'];

export type TiltDetection = Exclude<Detection, 'touch'>;

const RAD = Math.PI / 180;

/** Below this, the screen's plane is too near level to read spin from. */
export const SPIN_FLAT = 0.3;

/** Where touch reads −1 (low) and +1 (high), as a share of the screen's height down from the top. */
export const TOUCH_ENDS = { high: 0.15, low: 0.85 };

export function isDetection(value: unknown): value is Detection {
  return DETECTIONS.some((detection) => detection === value);
}

/** The detection after `detection` in DETECTIONS, back to the first after the last. */
export function nextDetection(detection: Detection): Detection {
  return DETECTIONS[(DETECTIONS.indexOf(detection) + 1) % DETECTIONS.length] ?? detection;
}

/** Which way is up, in the phone's own axes, from a device orientation's beta and gamma (degrees). */
export function upOf(beta: number | null, gamma: number | null): Vec | null {
  if (beta === null || gamma === null) {
    return null;
  }
  const b = beta * RAD;
  const g = gamma * RAD;
  return [-Math.cos(b) * Math.sin(g), Math.sin(b), Math.cos(b) * Math.cos(g)];
}

/**
 * Valence from which way is up, or null when it can't tell.
 * Flip: face up +1, edge on 0, face down −1. Invert: upright +1, upside down −1.
 * Spin, as a steering wheel with the screen to you: upright +1, landscape 0, upside down −1.
 */
export function detected(detection: TiltDetection, [x, y, z]: Vec): number | null {
  if (detection === 'flip') {
    return z;
  }
  if (detection === 'invert') {
    return y;
  }
  if (Math.hypot(x, y) < SPIN_FLAT) {
    return null;
  }
  return 1 - Math.abs(Math.atan2(-x, y)) / (Math.PI / 2);
}

/** Valence with a finger at `y` (0 top, 1 bottom): +1 near the top, −1 near the bottom, held past either. */
export function touchValence(y: number): number {
  const { high, low } = TOUCH_ENDS;
  return Math.max(-1, Math.min(1, -1 + (2 * (y - low)) / (high - low)));
}
