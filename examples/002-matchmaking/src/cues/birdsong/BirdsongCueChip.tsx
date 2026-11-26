import { BirdIcon } from '@phosphor-icons/react';
import { SPECIES } from './birdsongCue.ts';
import type { BirdsongCue } from './birdsongCue.ts';

/** A birdsong cue, small: a bird and the species' name. Cards don't play the sound. */
export function BirdsongCueChip({ cue }: { cue: BirdsongCue }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <BirdIcon aria-hidden className="size-4" />
      {SPECIES[cue.species]}
    </span>
  );
}
