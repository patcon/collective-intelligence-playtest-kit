import type { ReactNode } from 'react';
import { AvatarCueView } from './avatar/AvatarCueView.tsx';
import { BirdsongCueView } from './birdsong/BirdsongCueView.tsx';
import { ColourCueView } from './colour/ColourCueView.tsx';
import type { Cue } from './cueTypes.ts';
import { HapticCueView } from './haptic/HapticCueView.tsx';

/** A group's cue, full-screen, with `children` (what to do about it) over it. One renderer per cue type. */
export function CueView({ cue, children }: { cue: Cue; children?: ReactNode }) {
  switch (cue.type) {
    case 'avatar':
      return <AvatarCueView cue={cue}>{children}</AvatarCueView>;
    case 'birdsong':
      return <BirdsongCueView cue={cue}>{children}</BirdsongCueView>;
    case 'colour':
      return <ColourCueView cue={cue}>{children}</ColourCueView>;
    case 'haptic':
      return <HapticCueView cue={cue}>{children}</HapticCueView>;
  }
}
