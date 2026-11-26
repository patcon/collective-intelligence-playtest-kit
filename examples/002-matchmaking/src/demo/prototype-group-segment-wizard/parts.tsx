// PROTOTYPE (throwaway): the split bar and −/+ stepper from `GroupSegmentWizard`, fed from a `Division`.
import type { ReactNode } from 'react';
import { SplitBar, Stepper as WizardStepper } from '../GroupSegmentWizard/parts.tsx';
import type { Locked } from './divideMaths.ts';
import type { Division } from './useDivision.ts';

export function SplitPreview({ division }: { division: Division }) {
  return <SplitBar concerns={division.sizes.map((_, i) => division.isConcern(i))} ready={division.ready} sizes={division.sizes} />;
}

const NAMES: Record<Locked, string> = { groups: 'Groups', size: 'People per group' };

/** A number with −/+ either side. `muted` shows it as calculated rather than set. */
export function Stepper({ division, which, value, muted = false, label }: { division: Division; which: Locked; value: ReactNode; muted?: boolean; label?: ReactNode }) {
  return (
    <WizardStepper
      canFewer={division.canStep(which, -1)}
      canMore={division.canStep(which, 1)}
      label={label ?? NAMES[which]}
      muted={muted}
      noun={NAMES[which].toLowerCase()}
      onFewer={() => division.step(which, -1)}
      onMore={() => division.step(which, 1)}
      value={value}
      warn={division.problem !== null}
    />
  );
}
