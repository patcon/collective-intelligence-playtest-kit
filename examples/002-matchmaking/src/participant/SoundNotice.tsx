import { Banner } from '@cloudflare/kumo';
import { unlockAudio } from '@playtest-kit/common';
import { useAudioRunning } from '../hooks/effects/useAudioRunning.ts';

/** What every screen before an audio round says, the start screen included. */
export const SOUND_NOTICE = 'Sound is part of this round: turn your volume all the way up, and silent mode off.';

/**
 * Shown while waiting for a round that needs sound: the start screen's warning (`text`), looking the
 * same. If this browser hasn't let the page play sound (or has stopped it since), it adds a tap to turn it on.
 */
export function SoundNotice({ text = SOUND_NOTICE }: { text?: string }) {
  const running = useAudioRunning();
  return (
    <Banner
      action={running ? undefined : <Banner.Action onClick={unlockAudio}>Turn on sound</Banner.Action>}
      className="max-w-sm"
      description={running ? text : `${text} This browser isn't playing sound for this page yet.`}
      variant="alert"
    />
  );
}
