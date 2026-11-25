import { useState } from 'react';
import { useDeviceOrientation } from '../../hooks/effects/useDeviceOrientation.ts';
import type { OrientationStatus } from '../../hooks/effects/useDeviceOrientation.ts';
import { tiltReadings, upOf } from '../lib/valence.ts';
import type { TiltReadings, Vec } from '../lib/valence.ts';

export interface Tilt {
  /** Whether orientation can be read, and whether it is arriving (see `OrientationStatus`). */
  status: OrientationStatus;
  /** Asks for motion access. Call it from a tap: iOS only asks from a user gesture. */
  requestPermission: () => Promise<void>;
  /** Which way is up in the phone's own axes, or null until a reading arrives or while disabled. */
  up: Vec | null;
  /** Every tilt detection's valence from `up`, or null with no `up`. */
  readings: TiltReadings | null;
}

/**
 * Reads the phone's tilt while `enabled`, as every tilt detection at once, with no UI. `onTilt` is
 * called for each reading, for work that must see every one (a re-render can merge several).
 */
export function useTilt(enabled: boolean, onTilt?: (up: Vec, readings: TiltReadings) => void): Tilt {
  const [up, setUp] = useState<Vec | null>(null);
  const { requestPermission, status } = useDeviceOrientation(enabled, (beta, gamma) => {
    const next = upOf(beta, gamma);
    if (next === null) {
      return;
    }
    setUp(next);
    onTilt?.(next, tiltReadings(next));
  });

  const current = enabled ? up : null;
  return { readings: current && tiltReadings(current), requestPermission, status, up: current };
}
