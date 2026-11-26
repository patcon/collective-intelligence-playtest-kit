import { AvatarCueChip } from './avatar/AvatarCueChip.tsx';
import { BirdsongCueChip } from './birdsong/BirdsongCueChip.tsx';
import { ColourCueChip } from './colour/ColourCueChip.tsx';
import type { Cue } from './cueTypes.ts';

/** A group's cue, small enough for a card. One renderer per cue type, like `CueView`. */
export function CueChip({ cue }: { cue: Cue }) {
  switch (cue.type) {
    case 'avatar':
      return <AvatarCueChip cue={cue} />;
    case 'birdsong':
      return <BirdsongCueChip cue={cue} />;
    case 'colour':
      return <ColourCueChip cue={cue} />;
  }
}
