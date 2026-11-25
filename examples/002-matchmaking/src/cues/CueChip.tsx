import { ColourCueChip } from './colour/ColourCueChip.tsx';
import type { Cue } from './cueTypes.ts';

/** A group's cue, small enough for a card. One renderer per cue type, like `CueView`. */
export function CueChip({ cue }: { cue: Cue }) {
  return <ColourCueChip cue={cue} />;
}
