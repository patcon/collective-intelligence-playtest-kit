type Rgb = [number, number, number];

const LOW: Rgb = [220, 38, 38];
const MID: Rgb = [0, 0, 0];
const HIGH: Rgb = [22, 163, 74];
const UNKNOWN = 'rgb(115 115 115)';
/** The idle badge's dot colour, Kumo's, with its light-mode value in case the token isn't there. */
const IDLE = 'var(--color-kumo-badge-orange, oklch(81.5% 0.197 76))';
/** How much of the idle colour goes into an idle fill. */
const IDLE_TINT = '50%';

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function mix([r1, g1, b1]: Rgb, [r2, g2, b2]: Rgb, t: number): Rgb {
  return [lerp(r1, r2, t), lerp(g1, g2, t), lerp(b1, b2, t)];
}

function baseColor(v: number | null): string {
  if (v === null) {
    return UNKNOWN;
  }
  const clamped = Math.max(-1, Math.min(1, v));
  const [r, g, b] = clamped < 0 ? mix(MID, LOW, -clamped) : mix(MID, HIGH, clamped);
  return `rgb(${r} ${g} ${b})`;
}

/**
 * The fill for a valence: red at −1, black at 0, green at +1; grey when it can't tell. When `idle`,
 * tinted halfway to the idle badge's yellow, so the valence still shows through.
 */
export function valenceColor(v: number | null, idle = false): string {
  const base = baseColor(v);
  return idle ? `color-mix(in srgb, ${IDLE} ${IDLE_TINT}, ${base})` : base;
}

/** A valence as a signed number with two decimals, or a dot when it can't tell. */
export function formatValence(v: number | null): string {
  if (v === null) {
    return '·';
  }
  return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}`;
}
