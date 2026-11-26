// PROTOTYPE (throwaway): pieces the `GroupSegmentWizard` layouts share: the split preview and a −/+ stepper.
import { Button } from '@cloudflare/kumo';
import { MinusIcon, PlusIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import type { Division } from './useDivision.ts';
import type { Locked } from './divideMaths.ts';

/**
 * How the people ready now split: a bar cut into one segment per group, read out as one line to screen readers.
 * Shown even before anyone's ready, so the setting is visible up front. Only the groups that are a
 * concern turn orange (see `Division.isConcern`).
 */
export function SplitPreview({ division }: { division: Division }) {
  const { ready, groups, sizes, isConcern } = division;
  const summary = `${ready} ready, ${groups} ${groups === 1 ? 'group' : 'groups'} of ${sizes.join(', ')}`;
  return (
    <div className="flex flex-col gap-1.5">
      <div aria-label={summary} className="flex h-7 w-full gap-0.5 overflow-hidden rounded-md bg-kumo-fill" role="img">
        {sizes.map((size, i) => (
          // Empty groups still get a sliver, so the number of groups shows.
          <div
            className={`grid min-w-0 place-items-center text-xs font-semibold text-white tabular-nums ${isConcern(i) ? 'bg-kumo-warning' : 'bg-kumo-badge-neutral odd:bg-kumo-badge-neutral/80'}`}
            key={i}
            // Scaled by 10: flex-grow weights summing under 1 (two empty groups) leave the bar part empty.
            style={{ flexGrow: Math.max(size, 0.4) * 10 }}
          >
            {groups <= 12 ? size : null}
          </div>
        ))}
      </div>
    </div>
  );
}

const NAMES: Record<Locked, string> = { groups: 'Groups', size: 'People per group' };

/** A number with −/+ either side. `muted` shows it as calculated rather than set. */
export function Stepper({ division, which, value, muted = false, label }: { division: Division; which: Locked; value: ReactNode; muted?: boolean; label?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1 text-sm">{label ?? NAMES[which]}</div>
      <Button aria-label={`Fewer ${NAMES[which].toLowerCase()}`} disabled={!division.canStep(which, -1)} icon={MinusIcon} onClick={() => division.step(which, -1)} shape="circle" variant="secondary" />
      <span className={`w-10 text-center text-2xl font-semibold tabular-nums ${muted ? 'text-kumo-subtle' : division.problem ? 'text-kumo-warning' : ''}`}>{value}</span>
      <Button aria-label={`More ${NAMES[which].toLowerCase()}`} disabled={!division.canStep(which, 1)} icon={PlusIcon} onClick={() => division.step(which, 1)} shape="circle" variant="secondary" />
    </div>
  );
}
