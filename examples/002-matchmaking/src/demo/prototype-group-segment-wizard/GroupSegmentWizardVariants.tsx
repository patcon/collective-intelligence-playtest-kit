// PROTOTYPE (kept, not rendered): the layouts tried before `GroupSegmentWizard`'s compact one. Nothing in the
// app renders this. It's kept as code on purpose, against "no dead code", so the earlier ideas stay
// to hand (decided 2026-11-26, docs/specs/group-segment-wizard.md). It keeps its own state and never
// touches the room; its "aim for / at least" fits aren't in the room's model.
import { useDivision } from './useDivision.ts';
import { LAYOUTS } from './variants.tsx';
import type { GroupSegmentWizardLayout } from './variants.tsx';

interface GroupSegmentWizardVariantsProps {
  layout: GroupSegmentWizardLayout;
  ready: number;
  /** How many groups the cue can tell apart. */
  cueMax: number;
}

/** One of the earlier layouts, with its own local state. */
export function GroupSegmentWizardVariants({ layout, ready, cueMax }: GroupSegmentWizardVariantsProps) {
  const division = useDivision(ready, cueMax, 'aim');
  const Layout = LAYOUTS[layout];
  return <Layout division={division} />;
}
