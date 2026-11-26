import { unlockedAudio } from '@playtest-kit/common';
import { useEffect, useState } from 'react';
import { WebHaptics } from 'web-haptics';
import type { Vibration } from 'web-haptics';
import { playBuzz } from '../../cues/haptic/buzzSound.ts';
import { CAN_VIBRATE } from '../../cues/haptic/canVibrate.ts';
import { useAudioRunning } from './useAudioRunning.ts';

/** A timer that fires a moment early would otherwise schedule a second buzz straight after. */
const MIN_WAIT_MS = 100;

/**
 * How this phone plays a vibration pattern: `vibrate` if it can (see `CAN_VIBRATE`);
 * `sound`, the buzzing played out loud, without one (iPhones) but with sound on; or `unavailable`.
 */
export type HapticMode = 'vibrate' | 'sound' | 'unavailable';

/** Plays `pattern` once, the way `mode` says, and returns how to stop it. */
function playOnce(mode: HapticMode, haptics: WebHaptics, pattern: ReadonlyArray<Vibration>): () => void {
  const context = unlockedAudio();
  if (mode === 'sound' && context) {
    return playBuzz(context, pattern);
  }
  if (mode === 'vibrate') {
    void haptics.trigger([...pattern]);
  }
  return () => haptics.cancel();
}

/**
 * Plays `pattern` every `periodMs` while mounted, starting on whole multiples of `periodMs` by this
 * phone's clock. Phones' clocks agree to within a fraction of a second, so phones with the same
 * pattern buzz in step, and two pressed together feel like one. Vibrating needs no permission, only
 * an earlier tap on the page (the start screen's), as does sound.
 */
export function useHapticLoop(pattern: ReadonlyArray<Vibration>, periodMs: number): HapticMode {
  const [haptics] = useState(() => new WebHaptics());
  const audioRunning = useAudioRunning();
  const mode: HapticMode = CAN_VIBRATE ? 'vibrate' : audioRunning ? 'sound' : 'unavailable';

  useEffect(() => {
    if (mode === 'unavailable') {
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    let stop = () => {};
    // Re-aimed at the clock every time, so the loop doesn't drift the way `setInterval` would.
    const next = () => {
      const wait = periodMs - (Date.now() % periodMs);
      timer = setTimeout(
        () => {
          stop = playOnce(mode, haptics, pattern);
          next();
        },
        wait < MIN_WAIT_MS ? wait + periodMs : wait,
      );
    };
    next();
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [haptics, mode, pattern, periodMs]);

  useEffect(() => () => haptics.destroy(), [haptics]);

  return mode;
}
