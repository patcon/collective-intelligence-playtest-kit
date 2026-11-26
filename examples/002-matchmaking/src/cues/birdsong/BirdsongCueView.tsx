import { BirdIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { useLoopingSound } from '../../hooks/effects/useLoopingSound.ts';
import { birdsongUrl, SPECIES } from './birdsongCue.ts';
import type { BirdsongCue } from './birdsongCue.ts';

const STATUS_NOTE = {
  loading: 'Loading the song…',
  playing: 'Listen for the phones playing the same song.',
  unavailable: "The song can't play on this phone. Find the others by name.",
};

/** The group's birdsong, playing on a loop, with the species named in case the sound can't play or be heard. */
export function BirdsongCueView({ cue, children }: { cue: BirdsongCue; children?: ReactNode }) {
  const status = useLoopingSound(birdsongUrl(cue.species));
  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-kumo-base p-8 text-center">
      <BirdIcon aria-hidden className="size-24 text-kumo-subtle" weight="duotone" />
      <p className="text-5xl font-bold">{SPECIES[cue.species]}</p>
      <p className="max-w-sm text-kumo-subtle">{STATUS_NOTE[status]}</p>
      {children}
    </main>
  );
}
