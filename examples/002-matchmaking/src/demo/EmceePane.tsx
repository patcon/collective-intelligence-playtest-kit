import { Badge, Meter } from '@cloudflare/kumo';
import { ActivityCard } from '../activity/ActivityCard.tsx';
import { CUE_TYPES, cueLabel } from '../cues/cueTypes.ts';
import type { MatchConfig, RoomSnapshot } from '../room/protocol.ts';
import { EmceeControls, ResetButton } from './EmceeControls.tsx';
import type { RoundCommand } from './EmceeControls.tsx';
import { PhaseFlow } from './PhaseFlow.tsx';
import { progressOf } from './progressOf.ts';
import { GroupSegmentWizard, familyOf } from './prototype-group-segment-wizard/GroupSegmentWizard.tsx';
import { LayoutSwitcher, useLayoutChoice } from './prototype-group-segment-wizard/LayoutSwitcher.tsx';
import { useDivision } from './prototype-group-segment-wizard/useDivision.ts';
import { startBlocker } from './startBlocker.ts';
import type { RoomProgress } from './progressOf.ts';

interface EmceePaneProps {
  snapshot: RoomSnapshot;
  onCommand: (command: RoundCommand) => void;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function describeConfig({ grouping, cue }: MatchConfig): string {
  const groups = grouping.by === 'size' ? `groups of ${grouping.size}` : plural(grouping.count, 'group', 'groups');
  return `Random · ${groups} · ${cueLabel(cue)}`;
}

/**
 * How many are ready, in the lobby; how many have found their group, in a round and the activity.
 * Always the same height, so the stages below don't move as the phase changes.
 */
function Status({ phase, progress }: { phase: RoomSnapshot['phase']; progress: RoomProgress }) {
  return (
    <div className="flex h-10 flex-col justify-center">
      {phase === 'lobby' ? (
        <p className="text-3xl font-semibold">{progress.ready} ready</p>
      ) : (
        <Meter
          customValue={`${progress.peopleFound} of ${progress.people}`}
          label="People found"
          max={Math.max(1, progress.people)}
          value={progress.peopleFound}
        />
      )}
    </div>
  );
}

function ActivityStatus({ progress }: { progress: RoomProgress }) {
  return (
    <ActivityCard>
      <p className="font-medium">{`${plural(progress.groups, 'group', 'groups')} · ${plural(progress.people, 'person', 'people')}`}</p>
    </ActivityCard>
  );
}

const PHASE_BADGE: Record<RoomSnapshot['phase'], { variant: 'primary' | 'secondary' | 'beta'; label: (round: number) => string }> = {
  activity: { label: (round) => `Round ${round} · Activity`, variant: 'beta' },
  lobby: { label: () => 'Lobby', variant: 'secondary' },
  round: { label: (round) => `Round ${round}`, variant: 'primary' },
};

/**
 * The emcee's pane, phone-width and filling its screen: how many are ready and how the round is going
 * at the top, and the controls to move back and forward at the bottom (see `EmceeControls`). Start activity never waits for every group. The config
 * shows here read-only; it's set elsewhere. It has no frame of its own: `/demo` puts it in a `PhoneFrame`.
 */
export function EmceePane({ snapshot, onCommand }: EmceePaneProps) {
  const progress = progressOf(snapshot);
  const badge = PHASE_BADGE[snapshot.phase];
  // PROTOTYPE (throwaway): a split the people ready can't make blocks Start too.
  const { layout, select } = useLayoutChoice();
  const division = useDivision(progress.ready, CUE_TYPES[snapshot.config.cue].maxDistinct, familyOf(layout));
  const prototypeBlocker = import.meta.env.DEV ? division.problem : null;
  const controls = { blocker: startBlocker(progress.nextRound, snapshot.config.grouping) ?? prototypeBlocker, onCommand, phase: snapshot.phase };

  return (
    <div className="flex min-h-full w-full flex-1 flex-col gap-5 p-5">
      {/* Like a phone app's top bar: Reset on the left, the title in the middle, the phase on the right. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="justify-self-start">
          <ResetButton onCommand={onCommand} />
        </div>
        <h2 className="text-lg font-semibold">Emcee</h2>
        <div className="justify-self-end">
          <Badge variant={badge.variant}>{badge.label(snapshot.round)}</Badge>
        </div>
      </div>
      <Status phase={snapshot.phase} progress={progress} />
      <PhaseFlow snapshot={snapshot} />
      {/* Below the stages, so it doesn't push them down when the activity starts. */}
      {snapshot.phase === 'activity' && <ActivityStatus progress={progress} />}
      {/* The round being played, or in the lobby, the one about to start. */}
      <p className="text-sm text-kumo-subtle">This round: {describeConfig(snapshot.roundConfig ?? snapshot.config)}</p>
      {/* At the bottom of the screen, where a thumb reaches. */}
      <div className="mt-auto flex flex-col gap-5">
        {/* PROTOTYPE (throwaway): `GroupSegmentWizard`, in the layout ?variant= names (compact by default). Pinned
            above Start, so people arriving (more dots in the stages) doesn't move it. See docs/intent/emcee-divide-the-room.md. */}
        {import.meta.env.DEV && snapshot.phase === 'lobby' && (
          <>
            <GroupSegmentWizard division={division} layout={layout} />
            <LayoutSwitcher layout={layout} onLayout={select} />
          </>
        )}
        <EmceeControls {...controls} />
      </div>
    </div>
  );
}
