import type { RoomSnapshot } from '../room/protocol.ts';
import type { ParticipantStatus } from '../room/roomViews.ts';
import { groupColour, phaseFlow, STAGES } from './phaseFlow.ts';
import type { Stage } from './phaseFlow.ts';

const LABELS: Record<Stage, string> = { activity: 'Activity', found: 'Found', looking: 'Looking', starting: 'Starting', waiting: 'Waiting' };

/** A grey dot for anyone not in a group: hollow for late joiners, who are waiting for the round after this one. */
function greyDot(status: ParticipantStatus): string {
  return status === 'late' ? 'border-2 border-current text-kumo-subtle' : 'bg-current text-kumo-subtle';
}

/** The most dots a column shows; past that, a count of the rest. */
const MAX_DOTS = 24;

/** Everyone in the room as a dot, in a column for the stage they're at, so the emcee can watch them move along. */
export function PhaseFlow({ snapshot }: { snapshot: RoomSnapshot }) {
  const flow = phaseFlow(snapshot);
  return (
    <ol aria-label="Where everyone is" className="grid grid-cols-5 gap-1">
      {STAGES.map((stage) => {
        const members = flow[stage];
        return (
          <li className={`flex flex-col items-center gap-1.5 rounded-md p-1.5 ${members.length > 0 ? 'bg-kumo-tint' : 'opacity-50'}`} key={stage}>
            <span className="text-xs text-kumo-subtle">{LABELS[stage]}</span>
            <span className="text-lg font-semibold tabular-nums">{members.length}</span>
            <div aria-hidden className="flex flex-wrap justify-center gap-1">
              {members.slice(0, MAX_DOTS).map(({ id, status, group }) =>
                group === null ? (
                  <span className={`size-2.5 rounded-full ${greyDot(status)}`} key={id} />
                ) : (
                  // Outlined, so a light colour (yellow, pink) still shows on a light background.
                  <span className="size-2.5 rounded-full ring-1 ring-black/30" key={id} style={{ backgroundColor: groupColour(snapshot, group) }} />
                ),
              )}
              {members.length > MAX_DOTS && <span className="text-xs text-kumo-subtle">{`+${members.length - MAX_DOTS}`}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
