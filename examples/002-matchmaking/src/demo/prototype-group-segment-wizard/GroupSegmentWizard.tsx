// PROTOTYPE (throwaway): `GroupSegmentWizard`, the emcee's control for dividing the room. See docs/intent/emcee-divide-the-room.md.
import type { Division } from './useDivision.ts';
import { LAYOUTS } from './variants.tsx';
import type { GroupSegmentWizardLayout } from './variants.tsx';

export type { GroupSegmentWizardLayout } from './variants.tsx';

interface GroupSegmentWizardProps {
  /** From `useDivision`, called with this layout's `family` (see `familyOf`). */
  division: Division;
  /** How the control is laid out. `compact` unless you're comparing. */
  layout?: GroupSegmentWizardLayout;
}

/** Which fit choices a layout offers, for `useDivision`. */
export function familyOf(layout: GroupSegmentWizardLayout = 'compact') {
  return LAYOUTS[layout].family;
}

/** How many groups, or how many per group, with a bar showing how the people ready would split. */
export function GroupSegmentWizard({ division, layout = 'compact' }: GroupSegmentWizardProps) {
  const Layout = LAYOUTS[layout].component;
  return <Layout division={division} />;
}
