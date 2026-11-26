// PROTOTYPE (throwaway): the layouts `GroupSegmentWizard` can take. `compact` is the default; the rest, simplest
// first, are the earlier tries, each layering one idea on the last.
import { Tabs } from '@cloudflare/kumo';
import { ArrowsDownUpIcon, LockSimpleIcon } from '@phosphor-icons/react';
import { CycleTrack } from '../GroupSegmentWizard/CycleTrack.tsx';
import { sizeLabel } from './divideMaths.ts';
import type { Leftovers, Locked } from './divideMaths.ts';
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

interface Fit {
  value: Leftovers;
  label: string;
}

const SMART: Fit = { label: 'Smart', value: 'nearest' };
const FITS: ReadonlyArray<Fit> = [
  SMART,
  { label: 'Min', value: 'atLeast' },
  { label: 'Max', value: 'atMost' },
];

/** The number, with the fit under it; clicking it cycles Smart → Min → Max. In group mode the fit is hidden but keeps its space. */
function NumberWithFit({ division }: VariantProps) {
  const sizeMode = division.locked === 'size';
  const at = Math.max(0, FITS.findIndex((fit) => fit.value === division.leftovers));
  const fit = FITS[at] ?? SMART;
  const next = FITS[(at + 1) % FITS.length] ?? SMART;
  // The fit sits above the number, so the number lines up with the −/+; the row leaves room for it.
  const content = (
    <span className="relative block">
      {sizeMode ? division.size : division.groups}
      <CycleTrack
        at={at}
        className={`absolute bottom-full left-1/2 mb-1 w-16 -translate-x-1/2 text-[0.6875rem] ${sizeMode ? '' : 'invisible'}`}
        labels={FITS.map((f) => f.label)}
        row={18}
      />
    </span>
  );
  return sizeMode ? (
    <button
      aria-label={`${division.size} per group, ${fit.label}. Switch to ${next.label}`}
      className="w-full cursor-pointer rounded-md hover:bg-kumo-fill"
      onClick={() => division.setLeftovers(next.value)}
      type="button"
    >
      {content}
    </button>
  ) : (
    content
  );
}

interface Mode {
  value: Locked;
  label: string;
}

const MODES_GROUPS: Mode = { label: 'Groups', value: 'groups' };
const MODES: ReadonlyArray<Mode> = [
  MODES_GROUPS,
  { label: 'People per group', value: 'size' },
];

/** Groups or people per group, in a segmented-style window; clicking rolls to the other. */
function ModeToggle({ division }: VariantProps) {
  const at = MODES.findIndex((mode) => mode.value === division.locked);
  const current = MODES[at] ?? MODES_GROUPS;
  const next = MODES[(at + 1) % MODES.length] ?? MODES_GROUPS;
  return (
    <button
      aria-label={`Setting ${current.label.toLowerCase()}. Switch to ${next.label.toLowerCase()}`}
      className="cursor-pointer rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-kumo-brand focus-visible:outline-hidden"
      onClick={() => division.setLocked(next.value)}
      type="button"
    >
      <CycleTrack at={Math.max(0, at)} className="w-37" icon={<ArrowsDownUpIcon size={14} />} labels={MODES.map((m) => m.label)} row={32} />
    </button>
  );
}

/** `compact` (the default): one row. The mode chip cycles groups / people per group; the number cycles Smart / Min / Max. */
function Compact({ division }: VariantProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="pt-4">
        <Stepper division={division} label={<ModeToggle division={division} />} value={<NumberWithFit division={division} />} which={division.locked} />
      </div>
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

/** Every layout, default first: its component, which fit choices it offers, and a name for the switcher. */
export const LAYOUTS = {
  compact: { component: Compact, family: 'fit', name: 'Compact (cycling chips)' },
  groupsOnly: { component: GroupsOnly, family: 'aim', name: 'Groups only' },
  modeTabs: { component: ModeTabs, family: 'aim', name: 'Mode tabs' },
  linkedPair: { component: LinkedPair, family: 'aim', name: 'Linked pair' },
  linkedPairWithFit: { component: LinkedPairWithFit, family: 'aim', name: 'Linked pair + aim for/at least' },
} as const;

export type GroupSegmentWizardLayout = keyof typeof LAYOUTS;
