import { Badge, Meter } from '@cloudflare/kumo';
import { ActivityCard } from '../activity/ActivityCard.tsx';
import { cueLabel } from '../cues/cueTypes.ts';
import type { MatchConfig, RoomSnapshot } from '../room/protocol.ts';
import { EmceeControls, ResetButton } from './EmceeControls.tsx';
import type { RoundCommand } from './EmceeControls.tsx';
import { progressOf } from './progressOf.ts';
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

function LobbyStatus({ progress }: { progress: RoomProgress }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-3xl font-semibold">{progress.ready} ready</p>
      {progress.starting > 0 && <p className="text-sm text-kumo-subtle">{plural(progress.starting, 'more is', 'more are')} on the start screen</p>}
    </div>
  );
}

function RoundStatus({ progress }: { progress: RoomProgress }) {
  return (
    <div className="flex flex-col gap-2">
      <Meter
        customValue={`${progress.peopleFound} of ${progress.people}`}
        label="People found"
        max={Math.max(1, progress.people)}
        value={progress.peopleFound}
      />
      {progress.late > 0 && <p className="text-sm text-kumo-subtle">{`${progress.late} waiting for the next round`}</p>}
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
 * The emcee's pane, phone-width: how many are ready, how the round is going, and the controls to
 * move back and forward (see `EmceeControls`). Start activity never waits for every group. The config
 * shows here read-only; it's set elsewhere. It has no frame of its own: `/demo` puts it in a `PhoneFrame`.
 */
export function EmceePane({ snapshot, onCommand }: EmceePaneProps) {
  const progress = progressOf(snapshot);
  const badge = PHASE_BADGE[snapshot.phase];
  const controls = { blocker: startBlocker(progress.nextRound, snapshot.config.grouping), onCommand, phase: snapshot.phase };

  return (
    <div className="flex w-full flex-col gap-5 p-5">
      {/* Like a phone app's top bar: Reset on the left, the title in the middle, the phase on the right. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="justify-self-start">
          <ResetButton {...controls} />
        </div>
        <h2 className="text-lg font-semibold">Emcee</h2>
        <div className="justify-self-end">
          <Badge variant={badge.variant}>{badge.label(snapshot.round)}</Badge>
        </div>
      </div>
      {snapshot.phase === 'lobby' && <LobbyStatus progress={progress} />}
      {snapshot.phase === 'round' && <RoundStatus progress={progress} />}
      {snapshot.phase === 'activity' && <ActivityStatus progress={progress} />}
      <EmceeControls {...controls} />
      <p className="text-sm text-kumo-subtle">Next round: {describeConfig(snapshot.config)}</p>
    </div>
  );
}
