import type { ReactNode } from 'react';
import type { AvatarCue } from './avatarCue.ts';
import { avatarImage } from './avatarImage.ts';

/** The group's avatar, as large as the screen allows, with `children` below it. */
export function AvatarCueView({ cue, children }: { cue: AvatarCue; children?: ReactNode }) {
  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center gap-8 bg-kumo-base p-8 text-center">
      <img alt="Your group's avatar" className="aspect-square w-full max-w-80 rounded-3xl" src={avatarImage(cue)} />
      {children}
    </main>
  );
}
