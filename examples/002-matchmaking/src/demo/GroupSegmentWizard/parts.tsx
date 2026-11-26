// The pieces `GroupSegmentWizard` is built from: the split bar and a −/+ stepper. They take plain
// values, so the unrendered layouts in `prototype-group-segment-wizard/` can reuse them.
import { Button } from '@cloudflare/kumo';
import { MinusIcon, PlusIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

/** Above this many groups, segments are too narrow to label with their size. */
const MAX_LABELLED_GROUPS = 12;

interface SplitBarProps {
  ready: number;
  /** Group sizes, largest first (see `groupSizes`). */
  sizes: ReadonlyArray<number>;
  /** Per group, whether it's a concern and shows orange (see `groupConcerns`). */
  concerns: ReadonlyArray<boolean>;
}

/**
 * How the people ready now split: a bar cut into one segment per group, read out as one line to screen
 * readers. Shown even before anyone's ready, so the setting is visible up front.
 */
export function SplitBar({ ready, sizes, concerns }: SplitBarProps) {
  const summary = `${ready} ready, ${sizes.length} ${sizes.length === 1 ? 'group' : 'groups'} of ${sizes.join(', ')}`;
  return (
    <div aria-label={summary} className="flex h-7 w-full gap-0.5 overflow-hidden rounded-md bg-kumo-fill" role="img">
      {sizes.map((size, i) => (
        // Empty groups still get a sliver, so the number of groups shows.
        <div
          className={`grid min-w-0 place-items-center text-xs font-semibold text-white tabular-nums ${concerns[i] ? 'bg-kumo-warning' : 'bg-kumo-badge-neutral odd:bg-kumo-badge-neutral/80'}`}
          key={i}
          // Scaled by 10: flex-grow weights summing under 1 (two empty groups) leave the bar part empty.
          style={{ flexGrow: Math.max(size, 0.4) * 10 }}
        >
          {sizes.length <= MAX_LABELLED_GROUPS ? size : null}
        </div>
      ))}
    </div>
  );
}

interface StepperProps {
  /** What's being counted, lower case, for the −/+ labels: "groups", "people per group". */
  noun: string;
  value: ReactNode;
  label: ReactNode;
  onFewer: () => void;
  onMore: () => void;
  canFewer: boolean;
  canMore: boolean;
  /** Shows the value orange: the split it sets can't start. */
  warn?: boolean;
  /** Shows the value as calculated rather than set. */
  muted?: boolean;
}

/** A number with −/+ either side, and a label to its left. */
export function Stepper({ noun, value, label, onFewer, onMore, canFewer, canMore, warn = false, muted = false }: StepperProps) {
  const tone = muted ? 'text-kumo-subtle' : warn ? 'text-kumo-warning' : '';
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1 text-sm">{label}</div>
      <Button aria-label={`Fewer ${noun}`} disabled={!canFewer} icon={MinusIcon} onClick={onFewer} shape="circle" variant="secondary" />
      <span className={`w-10 text-center text-2xl font-semibold tabular-nums ${tone}`}>{value}</span>
      <Button aria-label={`More ${noun}`} disabled={!canMore} icon={PlusIcon} onClick={onMore} shape="circle" variant="secondary" />
    </div>
  );
}
