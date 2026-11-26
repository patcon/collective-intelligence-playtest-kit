import type { ReactNode } from 'react';
import { AvatarCueView } from './avatar/AvatarCueView.tsx';
import { ColourCueView } from './colour/ColourCueView.tsx';
import type { Cue } from './cueTypes.ts';

/** A group's cue, full-screen, with `children` (what to do about it) over it. One renderer per cue type. */
export function CueView({ cue, children }: { cue: Cue; children?: ReactNode }) {
  switch (cue.type) {
    case 'avatar':
      return <AvatarCueView cue={cue}>{children}</AvatarCueView>;
    case 'colour':
      return <ColourCueView cue={cue}>{children}</ColourCueView>;
  }
}
