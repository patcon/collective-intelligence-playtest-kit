import { EarIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { useLoopingSound } from '../../hooks/effects/useLoopingSound.ts';
import { birdsongUrl, SPECIES } from './birdsongCue.ts';
import type { BirdsongCue } from './birdsongCue.ts';

/**
 * The group's birdsong, playing on a loop. It's sound-only: the point is finding each other by ear,
 * so the species is named only, and small, when the sound can't play on this phone.
 */
export function BirdsongCueView({ cue, children }: { cue: BirdsongCue; children?: ReactNode }) {
  const status = useLoopingSound(birdsongUrl(cue.species));
  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-kumo-base p-8 text-center">
      <EarIcon aria-hidden className="size-24 text-kumo-subtle" weight="duotone" />
      <p className="text-4xl font-bold">Listen</p>
      {status === 'unavailable' ? (
        <p className="max-w-sm text-sm text-kumo-subtle">
          {`The sound can't play on this phone. Your group's bird is the ${SPECIES[cue.species].toLowerCase()}: ask around.`}
        </p>
      ) : (
        <p className="max-w-sm text-kumo-subtle">
          {status === 'loading' ? 'Loading the sound…' : 'Find phones playing the same sound as yours.'}
        </p>
      )}
      {children}
    </main>
  );
}
