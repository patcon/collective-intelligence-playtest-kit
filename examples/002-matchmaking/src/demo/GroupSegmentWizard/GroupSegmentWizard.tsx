import { ArrowsDownUpIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { FITS } from '../../matching/match.ts';
import type { Fit, Grouping } from '../../matching/match.ts';
import { groupConcerns, groupSizes, MIN_GROUP_SIZE, startBlocker } from '../../matching/split.ts';
import { CycleTrack } from './CycleTrack.tsx';
import { canStep, nextGrouping } from './nextGrouping.ts';
import type { WizardAction } from './nextGrouping.ts';
import { SplitBar, Stepper } from './parts.tsx';

const FIT_LABELS: Record<Fit, string> = { max: 'Max', min: 'Min', smart: 'Smart' };
const MODE_LABELS = ['Groups', 'People per group'];

interface GroupSegmentWizardProps {
  /** The room's grouping: which number the emcee sets is `grouping.by`. */
  grouping: Grouping;
  /** How many the next round would match. */
  ready: number;
  /** How many groups the cue can tell apart. */
  maxDistinct: number;
  onChange: (grouping: Grouping) => void;
}

/** The number, with the fit above it; clicking it cycles Smart → Min → Max. With groups set, the fit is hidden but keeps its space. */
function NumberWithFit({ grouping, onCycle }: { grouping: Grouping; onCycle: () => void }) {
  if (grouping.by === 'groupCount') {
    return (
      <span className="relative block">
        {grouping.groupCount}
        <CycleTrack at={0} className="invisible absolute bottom-full left-1/2 mb-1 w-16 -translate-x-1/2 text-[0.6875rem]" labels={['Smart']} row={18} />
      </span>
    );
  }
  const at = FITS.indexOf(grouping.fit);
  const next = FITS[(at + 1) % FITS.length] ?? 'smart';
  return (
    <button
      aria-label={`${grouping.groupSize} per group, ${FIT_LABELS[grouping.fit]}. Switch to ${FIT_LABELS[next]}`}
      className="w-full cursor-pointer rounded-md hover:bg-kumo-fill"
      onClick={onCycle}
      type="button"
    >
      <span className="relative block">
        {grouping.groupSize}
        {/* Above the number, so the number lines up with the −/+; the row leaves room for it. */}
        <CycleTrack at={at} className="absolute bottom-full left-1/2 mb-1 w-16 -translate-x-1/2 text-[0.6875rem]" labels={FITS.map((fit) => FIT_LABELS[fit])} row={18} />
      </span>
    </button>
  );
}

/** Groups or people per group, in a segmented-style window; clicking rolls to the other. */
function ModeToggle({ grouping, onSwitch }: { grouping: Grouping; onSwitch: () => void }) {
  const at = grouping.by === 'groupCount' ? 0 : 1;
  const current = (MODE_LABELS[at] ?? '').toLowerCase();
  const next = (MODE_LABELS[1 - at] ?? '').toLowerCase();
  return (
    <button
      aria-label={`Setting ${current}. Switch to ${next}`}
      className="cursor-pointer rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-kumo-brand focus-visible:outline-hidden"
      onClick={onSwitch}
      type="button"
    >
      <CycleTrack at={at} className="w-37" icon={<ArrowsDownUpIcon size={14} />} labels={MODE_LABELS} row={32} />
    </button>
  );
}

/**
 * The emcee's control for dividing the room: one −/+ row, set as groups or as people per group (the
 * chip switches), with a fit when people per group is set, and a bar showing how the people ready
 * split. What it shows is what Start makes; its setting is the room's, so it's shared and kept.
 */
export function GroupSegmentWizard({ grouping, ready, maxDistinct, onChange }: GroupSegmentWizardProps) {
  // The fit to come back to after switching to groups and back.
  const [lastFit, setLastFit] = useState<Fit>(grouping.by === 'groupSize' ? grouping.fit : 'smart');
  const act = (action: WizardAction) => {
    const next = nextGrouping(grouping, action, ready, grouping.by === 'groupSize' ? grouping.fit : lastFit);
    if (next.by === 'groupSize') {
      setLastFit(next.fit);
    }
    onChange(next);
  };
  const sizes = groupSizes(ready, grouping);
  const blocked = ready >= MIN_GROUP_SIZE && startBlocker(ready, grouping, maxDistinct) !== null;
  return (
    <div className="flex flex-col gap-3">
      <div className="pt-4">
        <Stepper
          canFewer={canStep(grouping, -1)}
          canMore={canStep(grouping, 1)}
          label={<ModeToggle grouping={grouping} onSwitch={() => act('switch')} />}
          noun={grouping.by === 'groupCount' ? 'groups' : 'people per group'}
          onFewer={() => act('fewer')}
          onMore={() => act('more')}
          value={<NumberWithFit grouping={grouping} onCycle={() => act('cycleFit')} />}
          warn={blocked}
        />
      </div>
      <SplitBar concerns={groupConcerns(sizes, grouping, maxDistinct)} ready={ready} sizes={sizes} />
    </div>
  );
}
