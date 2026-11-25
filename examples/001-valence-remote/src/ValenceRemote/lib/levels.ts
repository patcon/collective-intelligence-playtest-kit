/**
 * How finely a phone sends valence: as many evenly spaced values from −1 to +1 (2 is {−1, +1}, 3 is
 * {−1, 0, +1}, 21 is steps of 0.1), or null for every reading at full precision.
 */
export type Levels = number | null;

/** Steps of 0.01: as fine as a bar or a readout can show. */
export const DEFAULT_LEVELS = 201;

/** At most this many levels get tick marks on the bar; finer ones would only blur it. */
export const MAX_TICKED_LEVELS = 11;

/** How far past the edge between two levels a reading must go to move to the next, as a share of a step. */
export const HYSTERESIS = 0.25;

/** The URL's word for full precision, as in `?levels=full`. */
export const FULL_PRECISION = 'full';

export function isLevels(value: unknown): value is Levels {
  return value === null || (typeof value === 'number' && Number.isInteger(value) && value >= 2);
}

/** Levels from a URL parameter: a count, `full`, or undefined when absent or unreadable. */
export function levelsFromParam(param: string | null): Levels | undefined {
  if (param === FULL_PRECISION) {
    return null;
  }
  const levels = param === null ? Number.NaN : Number(param);
  return isLevels(levels) ? levels : undefined;
}

/** Levels as a URL parameter. */
export function levelsToParam(levels: Levels): string {
  return levels === null ? FULL_PRECISION : String(levels);
}

/** Each level's value, low to high. */
export function levelValues(levels: number): Array<number> {
  return Array.from({ length: levels }, (_, i) => clean(-1 + (2 * i) / (levels - 1)));
}

/** Where the bar gets tick marks: each level between the ends, when there are few enough to mark. */
export function tickValues(levels: Levels): Array<number> {
  return levels !== null && levels <= MAX_TICKED_LEVELS ? levelValues(levels).slice(1, -1) : [];
}

/** Strips float noise (−0.7000000000000001), so only the digits a level needs go on the wire. */
function clean(v: number): number {
  return Math.round(v * 1e6) / 1e6 || 0;
}

/**
 * Snaps each reading to the nearest of `levels`, holding a level until the reading is
 * HYSTERESIS past its edge, so a phone held near one doesn't flicker between two.
 * With null levels, passes readings through untouched.
 */
export function createQuantizer(levels: Levels): (v: number | null) => number | null {
  if (levels === null) {
    return (v) => v;
  }
  const step = 2 / (levels - 1);
  let held: number | null = null;
  return (v) => {
    if (v === null) {
      held = null;
      return null;
    }
    const position = (v + 1) / step;
    if (held === null || Math.abs(position - held) > 0.5 + HYSTERESIS) {
      held = Math.round(position);
    }
    return clean(-1 + held * step);
  };
}
