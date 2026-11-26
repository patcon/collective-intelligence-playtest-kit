// PROTOTYPE (kept, not rendered): the layouts tried before `GroupSegmentWizard`'s compact one, simplest
// first, each layering one idea on the last.
import { Tabs } from '@cloudflare/kumo';
import { LockSimpleIcon } from '@phosphor-icons/react';
import { sizeLabel } from './divideMaths.ts';
import type { Locked } from './divideMaths.ts';
import { SplitPreview, Stepper } from './parts.tsx';
import type { Division } from './useDivision.ts';

interface VariantProps {
  division: Division;
}

/** `groupsOnly`: one number, groups. People per group is only seen in the bar. */
function GroupsOnly({ division }: VariantProps) {
  return (
    <div className="flex flex-col gap-3">
      <Stepper division={division} value={division.groups} which="groups" />
      <SplitPreview division={division} />
    </div>
  );
}

/** `modeTabs`: tabs to pick what you're thinking in, then one −/+ pair; the other number beside it. */
function ModeTabs({ division }: VariantProps) {
  const other = division.locked === 'groups' ? `${sizeLabel(division.sizes)} people each` : `${division.groups} groups`;
  return (
    <div className="flex flex-col gap-3">
      <Tabs
        onValueChange={(value) => (value === 'groups' || value === 'size') && division.setLocked(value)}
        tabs={[
          { label: 'Groups', value: 'groups' },
          { label: 'People per group', value: 'size' },
        ]}
        value={division.locked}
      />
      <Stepper
        division={division}
        label={<span className="text-kumo-subtle">→ {other}</span>}
        value={division.locked === 'groups' ? division.groups : division.size}
        which={division.locked}
      />
      <SplitPreview division={division} />
    </div>
  );
}

function PairRow({ division, which, extra }: { division: Division; which: Locked; extra?: React.ReactNode }) {
  const isSet = division.locked === which;
  const value = which === 'groups' ? division.groups : isSet ? division.size : sizeLabel(division.sizes);
  const name = which === 'groups' ? 'Groups' : 'People per group';
  const label = (
    <div className="flex flex-col">
      <span className={`flex items-center gap-1 ${isSet ? 'font-medium' : 'text-kumo-subtle'}`}>
        {name}
        {isSet && <LockSimpleIcon aria-label="set by you" size={12} />}
      </span>
      <span className="text-xs text-kumo-subtle">{isSet ? extra : 'calculated'}</span>
    </div>
  );
  return <Stepper division={division} label={label} muted={!isSet} value={value} which={which} />;
}

/** `linkedPair`: both numbers, both with −/+. The one you last pressed is set; the other is calculated and greyed. */
function LinkedPair({ division }: VariantProps) {
  return (
    <div className="flex flex-col gap-3">
      <PairRow division={division} which="groups" />
      <PairRow division={division} which="size" />
      <SplitPreview division={division} />
    </div>
  );
}

/** `linkedPairWithFit`: `linkedPair`, plus a quiet "aim for / at least" on people per group, only there while it's the one set. */
function LinkedPairWithFit({ division }: VariantProps) {
  const flip = () => division.setLeftovers(division.leftovers === 'atLeast' ? 'aimFor' : 'atLeast');
  const extra = (
    <button className="cursor-pointer underline decoration-dotted underline-offset-2" onClick={flip} type="button">
      {division.leftovers === 'atLeast' ? 'at least (extras join groups)' : 'aim for (short groups flagged)'}
    </button>
  );
  return (
    <div className="flex flex-col gap-3">
      <PairRow division={division} which="groups" />
      <PairRow division={division} extra={extra} which="size" />
      <SplitPreview division={division} />
    </div>
  );
}

/** Every layout, simplest first. */
export const LAYOUTS = { groupsOnly: GroupsOnly, linkedPair: LinkedPair, linkedPairWithFit: LinkedPairWithFit, modeTabs: ModeTabs } as const;

export type GroupSegmentWizardLayout = keyof typeof LAYOUTS;
