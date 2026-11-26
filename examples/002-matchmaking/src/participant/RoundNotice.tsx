import { Banner } from '@cloudflare/kumo';
import { CAN_VIBRATE } from '../cues/haptic/canVibrate.ts';
import type { CueSense } from '../cues/cueTypes.ts';
import { SOUND_NOTICE, SoundNotice } from './SoundNotice.tsx';

/** Before a haptics round. A phone that can't vibrate (an iPhone) plays the sound of buzzing instead, so it needs sound. */
const HAPTIC_NOTICE = CAN_VIBRATE
  ? 'Vibration is part of this round: turn off Do Not Disturb and battery saver, and keep this page open.'
  : "Vibration is part of this round, but this phone can't vibrate for a web page, so it will buzz out loud: turn your volume all the way up, and silent mode off.";

/** What every screen before a round of each sense says, the start screen included, or null. */
export function roundWarning(sense: CueSense | null): string | null {
  switch (sense) {
    case 'audio':
      return SOUND_NOTICE;
    case 'haptic':
      return HAPTIC_NOTICE;
    default:
      return null;
  }
}

/** Shown while waiting, when the next round needs something of the phone: sound up, or vibration on. */
export function RoundNotice({ sense }: { sense: CueSense | null }) {
  switch (sense) {
    case 'audio':
      return <SoundNotice />;
    case 'haptic':
      return CAN_VIBRATE ? <Banner className="max-w-sm" description={HAPTIC_NOTICE} variant="alert" /> : <SoundNotice text={HAPTIC_NOTICE} />;
    default:
      return null;
  }
}
