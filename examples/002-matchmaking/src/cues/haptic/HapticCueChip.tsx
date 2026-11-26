import { VibrateIcon } from '@phosphor-icons/react';
import { RHYTHMS } from './hapticCue.ts';
import type { HapticCue } from './hapticCue.ts';

/** A haptic cue, small: a buzzing phone and the rhythm's name. Cards don't vibrate. */
export function HapticCueChip({ cue }: { cue: HapticCue }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <VibrateIcon aria-hidden className="size-4" />
      {RHYTHMS[cue.rhythm].name}
    </span>
  );
}
