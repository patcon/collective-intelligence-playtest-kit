import type { AvatarCue } from './avatarCue.ts';
import { avatarImage } from './avatarImage.ts';

/** An avatar cue, small enough for a card. */
export function AvatarCueChip({ cue }: { cue: AvatarCue }) {
  return <img alt="Group avatar" className="size-8 rounded-md" src={avatarImage(cue)} />;
}
