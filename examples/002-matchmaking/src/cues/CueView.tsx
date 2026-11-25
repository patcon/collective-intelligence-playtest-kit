import type { ReactNode } from 'react';
import { ColourCueView } from './colour/ColourCueView.tsx';
import type { Cue } from './cueTypes.ts';

/** A group's cue, full-screen, with `children` (what to do about it) over it. One renderer per cue type. */
export function CueView({ cue, children }: { cue: Cue; children?: ReactNode }) {
  return <ColourCueView cue={cue}>{children}</ColourCueView>;
}
