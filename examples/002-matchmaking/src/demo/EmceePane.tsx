import { Badge, Meter } from '@cloudflare/kumo';
import { ActivityCard } from '../activity/ActivityCard.tsx';
import { startBlocker } from '../matching/split.ts';
import { CUE_TYPES, cueLabel } from '../cues/cueTypes.ts';
import type { MatchConfig, RoomSnapshot } from '../room/protocol.ts';
import { EmceeControls, ResetButton } from './EmceeControls.tsx';
import type { RoundCommand } from './EmceeControls.tsx';
import { PhaseFlow } from './PhaseFlow.tsx';
import { progressOf } from './progressOf.ts';
import { GroupSegmentWizard } from './GroupSegmentWizard/GroupSegmentWizard.tsx';
import type { RoomProgress } from './progressOf.ts';

interface EmceePaneProps {
  snapshot: RoomSnapshot;
  onCommand: (command: RoundCommand) => void;
  /** Sends the room a new config, as the wizard changes the grouping. */
  onConfig: (config: MatchConfig) => void;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function describeConfig({ grouping, cue }: MatchConfig): string {
  const groups = grouping.by === 'groupSize' ? `groups of ${grouping.groupSize}` : plural(grouping.groupCount, 'group', 'groups');
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
 * at the top, and the controls to move back and forward at the bottom (see `EmceeControls`). Start activity never waits for every group. In the
 * lobby, `GroupSegmentWizard` sets how the room divides. It has no frame of its own: `/demo` puts it in a `PhoneFrame`.
 */
export function EmceePane({ snapshot, onCommand, onConfig }: EmceePaneProps) {
  const progress = progressOf(snapshot);
  const badge = PHASE_BADGE[snapshot.phase];
  const { maxDistinct } = CUE_TYPES[snapshot.config.cue];
  const controls = { blocker: startBlocker(progress.nextRound, snapshot.config.grouping, maxDistinct), onCommand, phase: snapshot.phase };

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
        {/* Pinned above Start, so people arriving (more dots in the stages) doesn't move it. */}
        {snapshot.phase === 'lobby' && (
          <GroupSegmentWizard
            grouping={snapshot.config.grouping}
            maxDistinct={maxDistinct}
            onChange={(grouping) => onConfig({ ...snapshot.config, grouping })}
            ready={progress.nextRound}
          />
        )}
        <EmceeControls {...controls} />
      </div>
    </div>
  );
}
