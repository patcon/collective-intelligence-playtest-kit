type Rgb = [number, number, number];

const LOW: Rgb = [220, 38, 38];
const MID: Rgb = [0, 0, 0];
const HIGH: Rgb = [22, 163, 74];
const UNKNOWN = 'rgb(115 115 115)';

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function mix([r1, g1, b1]: Rgb, [r2, g2, b2]: Rgb, t: number): Rgb {
  return [lerp(r1, r2, t), lerp(g1, g2, t), lerp(b1, b2, t)];
}

/** The fill for a valence: red at −1, black at 0, green at +1; grey when it can't tell, or when `idle`. */
export function valenceColor(v: number | null, idle = false): string {
  if (v === null || idle) {
    return UNKNOWN;
  }
  const clamped = Math.max(-1, Math.min(1, v));
  const [r, g, b] = clamped < 0 ? mix(MID, LOW, -clamped) : mix(MID, HIGH, clamped);
  return `rgb(${r} ${g} ${b})`;
}

/** A valence as a signed number with two decimals, or a dot when it can't tell. */
export function formatValence(v: number | null): string {
  if (v === null) {
    return '·';
  }
  return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}`;
}
