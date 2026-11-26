import { VibrateIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { useHapticLoop } from '../../hooks/effects/useHapticLoop.ts';
import type { HapticMode } from '../../hooks/effects/useHapticLoop.ts';
import { RHYTHM_PERIOD_MS, RHYTHMS } from './hapticCue.ts';
import type { HapticCue } from './hapticCue.ts';

const INSTRUCTIONS: Record<Exclude<HapticMode, 'unavailable'>, string> = {
  sound: "Your phone can't vibrate, so it's buzzing out loud. Find others with the same vibration pattern.",
  vibrate: 'Your phone should be buzzing. Find others with the same vibration pattern.',
};

/**
 * The group's rhythm, buzzing over and over: vibrating, or on a phone that can't (iPhones), the
 * sound of it. People find each other by holding each other's phones, or pressing them together,
 * so the rhythm is named only, and small, when this phone can do neither.
 */
export function HapticCueView({ cue, children }: { cue: HapticCue; children?: ReactNode }) {
  const { name, dots, pattern } = RHYTHMS[cue.rhythm];
  const mode = useHapticLoop(pattern, RHYTHM_PERIOD_MS);
  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-kumo-base p-8 text-center">
      <VibrateIcon aria-hidden className="size-24 text-kumo-subtle" weight="duotone" />
      <p className="text-4xl font-bold">Feel</p>
      {mode === 'unavailable' ? (
        <p className="max-w-sm text-sm text-kumo-subtle">
          {`This phone can't vibrate or play sound for this page. Your group's pattern is ${name.toLowerCase()} (${dots}): feel other people's phones, and ask around.`}
        </p>
      ) : (
        <p className="max-w-sm text-kumo-subtle">{INSTRUCTIONS[mode]}</p>
      )}
      {children}
    </main>
  );
}
