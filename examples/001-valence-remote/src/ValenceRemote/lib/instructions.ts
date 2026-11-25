import type { OrientationStatus } from '../../hooks/effects/useDeviceOrientation.ts';
import type { AxisLabels } from './axisLabels.ts';
import type { Detection } from './valence.ts';

/** Flip mode's instruction, in the axis labels' words when there are some. */
export function flipInstruction(labels: AxisLabels | null = null): string {
  const { positive, negative } = labels ?? { negative: '−1', positive: '+1' };
  return `Face up for ${positive}, face down for ${negative}`;
}

/** What to do with the phone, for each detection. */
export const INSTRUCTIONS: Record<Detection, string> = {
  flip: flipInstruction(),
  invert: 'Upright for +1, upside down for −1',
  spin: 'Screen to you, steer upright for +1, upside down for −1',
  touch: 'Touch higher for +1, lower for −1',
};

/** What to tell someone about reading tilt, or null when there's nothing to say. */
export const ORIENTATION_NOTES: Record<OrientationStatus, string | null> = {
  denied: 'Motion access was refused. Reload to ask again.',
  insecure: 'Tilt needs a secure (https) page.',
  live: null,
  'needs-permission': 'Motion access is needed. Reload and tap start again.',
  'no-signal': 'No tilt readings from this device. Try ?detection=touch.',
  unsupported: "This browser can't read tilt. Try ?detection=touch.",
  waiting: 'Waiting for tilt readings…',
};

/** A short name for each detection, for pickers. */
export const DETECTION_LABELS: Record<Detection, string> = {
  flip: 'Flip (face up / down)',
  invert: 'Invert (upright / upside down)',
  spin: 'Spin (steering wheel)',
  touch: 'Touch (finger height)',
};
