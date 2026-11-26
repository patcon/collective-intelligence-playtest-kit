import { Banner } from '@cloudflare/kumo';
import { unlockAudio } from '@playtest-kit/common';
import { useAudioRunning } from '../hooks/effects/useAudioRunning.ts';

/** What every screen before an audio round says, the start screen included. */
export const SOUND_NOTICE = 'Sound is part of this round: turn your volume all the way up, and silent mode off.';

/**
 * Shown while waiting for an audio round: turn the sound up, and, if this browser hasn't let the page
 * play sound (or has stopped it since), a tap to turn it back on.
 */
export function SoundNotice() {
  const running = useAudioRunning();
  if (running) {
    return <Banner className="max-w-sm text-left" description={SOUND_NOTICE} title="Turn your sound up" />;
  }
  return (
    <Banner
      action={<Banner.Action onClick={unlockAudio}>Turn on sound</Banner.Action>}
      className="max-w-sm text-left"
      description={`${SOUND_NOTICE} This browser isn't playing sound for this page yet.`}
      title="Sound is off"
      variant="alert"
    />
  );
}
