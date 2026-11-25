import { useState } from 'react';
import { useInterval } from '../../hooks/effects/useInterval.ts';
import { useWakeLock } from '../../hooks/effects/useWakeLock.ts';
import { unlockAudio } from '../lib/audio.ts';
import type { Activity, IdleSettings } from '../lib/activity.ts';
import { createQuantizer, DEFAULT_LEVELS } from '../lib/levels.ts';
import type { Levels } from '../lib/levels.ts';
import { createSender, SEND_MS } from '../lib/sender.ts';
import type { Valence } from '../lib/sender.ts';
import { touchValence } from '../lib/valence.ts';
import type { Detection } from '../lib/valence.ts';
import { useActivity } from './useActivity.ts';
import type { Tilt } from './useTilt.ts';
import { useTilt } from './useTilt.ts';

export interface ValenceRemoteOptions {
  /** How the phone reads as valence. Touch also works on desktop. */
  detection: Detection;
  /** How finely valence is sent (see `Levels`); DEFAULT_LEVELS (steps of 0.01) unless given. */
  levels?: Levels;
  /** Snapped to `levels`, sent only when it changes and at most every ~50 ms; null when it can't tell. */
  onValence?: (valence: Valence) => void;
  /** On mount and whenever it changes: `arrived`, then `active` or `idle` (see `Activity`). */
  onActivity?: (activity: Activity) => void;
  /** When a tilt remote counts as idle, over DEFAULT_IDLE; read once on mount. */
  idle?: Partial<IdleSettings>;
  /** Keep the screen awake while running, via the Wake Lock API. */
  keepAwake?: boolean;
}

export interface ValenceRemoteState {
  /** Whether `start` has been called. Nothing is read or sent before. */
  started: boolean;
  /** Starts the remote. Call it from a tap: it asks for motion access and unlocks audio, which iOS only allows from one. */
  start: () => void;
  /** Readies the remote for `next` (from a tap, for motion access); pass `next` back in as `detection` to switch. */
  prepare: (next: Detection) => void;
  /** The current detection's valence, unthrottled and unsnapped, so what shows it moves smoothly; null when it can't tell. */
  valence: Valence;
  /** `valence` snapped to `levels`, as it's sent (unthrottled). */
  snapped: Valence;
  activity: Activity;
  /** Every tilt detection at once, read whenever started and not in touch mode. */
  tilt: Tilt;
  /** True when the screen was meant to stay awake but couldn't be kept so. */
  wakeLockLost: boolean;
  /** Touch mode's input: a finger at `y` (0 top, 1 bottom), or lifted. `y` is null while lifted. */
  touch: { y: number | null; press: (y: number) => void; release: () => void };
}

/** A phone as a valence remote, with no UI: reads it in the chosen detection, throttles what's sent, and tracks activity. */
export function useValenceRemote({
  detection,
  levels = DEFAULT_LEVELS,
  onValence,
  onActivity,
  idle,
  keepAwake = true,
}: ValenceRemoteOptions): ValenceRemoteState {
  const [started, setStarted] = useState(false);
  const [valence, setValence] = useState<Valence>(null);
  const [snapped, setSnapped] = useState<Valence>(null);
  const [touchY, setTouchY] = useState<number | null>(null);
  const [sender] = useState(createSender);
  const [quantizer, setQuantizer] = useState(() => ({ levels, quantize: createQuantizer(levels) }));
  if (quantizer.levels !== levels) {
    setQuantizer({ levels, quantize: createQuantizer(levels) });
  }
  const isTouch = detection === 'touch';
  const wakeLock = useWakeLock(started && keepAwake);
  const { activity, tracker } = useActivity(started, onActivity, idle);

  const emit = (out: Valence | undefined) => {
    if (out !== undefined) {
      onValence?.(out);
    }
  };

  const report = (v: Valence) => {
    const out = quantizer.quantize(v);
    setValence(v);
    setSnapped(out);
    emit(sender.update(out, performance.now()));
  };

  const tilt = useTilt(started && !isTouch, (up, readings) => {
    tracker.tilt(up, performance.now());
    if (detection !== 'touch') {
      report(readings[detection]);
    }
  });

  useInterval(() => emit(sender.flush(performance.now())), SEND_MS, started);

  /** Starts reading afresh in a mode; tilt counts as active for a moment while readings arrive. */
  const begin = (next: Detection) => {
    if (next !== 'touch') {
      tracker.poke(performance.now());
    }
    setTouchY(null);
    report(null);
  };

  /**
   * The start tap is the one gesture every mode gets, so it asks for everything the remote may need
   * later, whatever the mode: motion access (so a switch to tilt needn't come back here) and audio.
   */
  const start = () => {
    void tilt.requestPermission();
    unlockAudio();
    begin(detection);
    setStarted(true);
  };

  /** Asking again for motion access is a no-op once granted. */
  const prepare = (next: Detection) => {
    if (next !== 'touch') {
      void tilt.requestPermission();
    }
    begin(next);
  };

  const press = (y: number) => {
    tracker.touch(true);
    setTouchY(y);
    report(touchValence(y));
  };

  /** A lifted finger leaves no valence. */
  const release = () => {
    tracker.touch(false);
    setTouchY(null);
    report(null);
  };

  return {
    activity,
    prepare,
    snapped,
    start,
    started,
    tilt,
    touch: { press, release, y: touchY },
    valence,
    wakeLockLost: keepAwake && !wakeLock.acquired,
  };
}
