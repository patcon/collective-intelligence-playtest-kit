import { Badge, Button, Meter } from '@cloudflare/kumo';
import { ActivityCard } from '../activity/ActivityCard.tsx';
import { cueLabel } from '../cues/cueTypes.ts';
import type { MatchConfig, RoomSnapshot } from '../room/protocol.ts';
import { progressOf } from './progressOf.ts';
import { startBlocker } from './startBlocker.ts';
import type { RoomProgress } from './progressOf.ts';

/** What the emcee can tell the room to do. */
export type RoundCommand = { type: 'start' } | { type: 'moveOn' } | { type: 'reset' };

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
        customValue={`${progress.groupsFound} of ${progress.groups}`}
        label="Groups found"
        max={Math.max(1, progress.groups)}
        value={progress.groupsFound}
      />
      <p className="text-sm text-kumo-subtle">
        {`${progress.peopleFound} of ${plural(progress.people, 'person', 'people')} found`}
        {progress.late > 0 && ` · ${progress.late} waiting for the next round`}
      </p>
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

/** Start, disabled with the reason when the room would refuse it (see `startBlocker`). */
function StartButton({ blocker, onStart }: { blocker: string | null; onStart: () => void }) {
  return (
    <div className="flex flex-col gap-1">
      <Button disabled={blocker !== null} onClick={onStart} size="lg" variant="primary">
        Start matchmaking
      </Button>
      {blocker && <p className="text-sm text-kumo-subtle">{blocker}</p>}
    </div>
  );
}

const PHASE_BADGE: Record<RoomSnapshot['phase'], { variant: 'primary' | 'secondary' | 'beta'; label: (round: number) => string }> = {
  activity: { label: (round) => `Round ${round} · Activity`, variant: 'beta' },
  lobby: { label: () => 'Lobby', variant: 'secondary' },
  round: { label: (round) => `Round ${round}`, variant: 'primary' },
};

/**
 * The emcee's controls, phone-width: how many are ready, how the round is going, and Start
 * matchmaking, Start activity, End activity and Reset. Start activity never waits for every group.
 * Both activity buttons send `moveOn`: it takes a round to the activity, and the activity
 * back to the lobby. The config shows here read-only; it's set elsewhere. It has no frame of its own:
 * `/demo` puts it in a `PhoneFrame`.
 */
export function EmceePane({ snapshot, onCommand }: EmceePaneProps) {
  const progress = progressOf(snapshot);
  const badge = PHASE_BADGE[snapshot.phase];
  const moveOn = (label: string) => (
    <Button onClick={() => onCommand({ type: 'moveOn' })} size="lg" variant="primary">
      {label}
    </Button>
  );

  return (
    <div className="flex w-full flex-col gap-5 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Emcee</h2>
        <Badge variant={badge.variant}>{badge.label(snapshot.round)}</Badge>
      </div>
      {snapshot.phase === 'lobby' && <LobbyStatus progress={progress} />}
      {snapshot.phase === 'lobby' && <StartButton blocker={startBlocker(progress.ready, snapshot.config.grouping)} onStart={() => onCommand({ type: 'start' })} />}
      {snapshot.phase === 'round' && <RoundStatus progress={progress} />}
      {snapshot.phase === 'round' && moveOn('Start activity')}
      {snapshot.phase === 'activity' && <ActivityStatus progress={progress} />}
      {snapshot.phase === 'activity' && moveOn('End activity')}
      <Button onClick={() => onCommand({ type: 'reset' })} variant="secondary">
        Reset
      </Button>
      <p className="text-sm text-kumo-subtle">Next round: {describeConfig(snapshot.config)}</p>
    </div>
  );
}
