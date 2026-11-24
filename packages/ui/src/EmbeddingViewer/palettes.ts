import { Color } from 'three';
import type { ViewerTrack } from './types.ts';

// Background for every 3D scene: black so the bright gradients (and bloom) read well.
export const SCENE_BG = new Color(0x00_00_00);

/** Linear RGB, as `Color` holds it. */
type Rgb = readonly [number, number, number];

// Per-track gradients (v9's sessions): start → end of each path.
const TRACK_LUTS: ReadonlyArray<ReadonlyArray<Rgb>> = [
  // A: blue → cyan → aqua
  [
    [0.1, 0.3, 1.0],
    [0.0, 0.7, 1.0],
    [0.3, 1.0, 0.95],
  ],
  // B: magenta → coral → amber
  [
    [0.85, 0.1, 0.75],
    [1.0, 0.35, 0.35],
    [1.0, 0.8, 0.1],
  ],
  // C: forest → green → pale lime
  [
    [0.05, 0.55, 0.25],
    [0.3, 0.9, 0.35],
    [0.85, 1.0, 0.55],
  ],
  // D: violet → lavender → pink
  [
    [0.4, 0.15, 0.95],
    [0.65, 0.45, 1.0],
    [1.0, 0.75, 0.95],
  ],
];

/** Gradient stops for track `k`: its own `colors` when it has any, else v9's palette for that index. */
export function trackLut(track: ViewerTrack | undefined, k: number): ReadonlyArray<Rgb> {
  const colors = track?.colors;
  if (colors && colors.length > 0) {
    return colors.map((css): Rgb => {
      const c = new Color(css);
      return [c.r, c.g, c.b];
    });
  }
  return TRACK_LUTS[k % TRACK_LUTS.length] ?? [];
}

/** Colour at `t` along a gradient (0 = start, 1 = end). */
export function lutColor(lut: ReadonlyArray<Rgb>, t: number): Color {
  const scaled = Math.min(0.9999, Math.max(0, t)) * (lut.length - 1);
  const lo = Math.floor(scaled);
  const f = scaled - lo;
  const a = lut[lo];
  if (!a) {
    return new Color();
  }
  const b = lut[lo + 1] ?? a;
  return new Color(a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1]), a[2] + f * (b[2] - a[2]));
}
