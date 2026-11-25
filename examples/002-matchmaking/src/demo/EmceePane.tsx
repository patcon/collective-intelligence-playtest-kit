import { Badge, Button, Meter, Surface } from '@cloudflare/kumo';
import type { MatchConfig, RoomSnapshot } from '../room/protocol.ts';
import { progressOf } from './progressOf.ts';
import type { RoomProgress } from './progressOf.ts';

/** What the emcee can tell the room to do. */
export type RoundCommand = { type: 'start' } | { type: 'moveOn' } | { type: 'reset' };

interface EmceePaneProps {
  snapshot: RoomSnapshot;
  onCommand: (command: RoundCommand) => void;
}

function describeConfig({ grouping, cue }: MatchConfig): string {
  const groups = grouping.by === 'size' ? `groups of ${grouping.size}` : `${grouping.count} groups`;
  return `Random · ${groups} · ${cue} cue`;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
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

/**
 * The emcee's controls, phone-width: how many are ready, how the round is going, and Start, Move on
 * and Reset. Move on never waits for every group. The config shows here read-only; it's set elsewhere.
 */
export function EmceePane({ snapshot, onCommand }: EmceePaneProps) {
  const progress = progressOf(snapshot);
  const inRound = snapshot.phase === 'round';

  return (
    <Surface className="flex w-full max-w-sm flex-col gap-5 rounded-lg p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Emcee</h2>
        <Badge variant={inRound ? 'primary' : 'secondary'}>{inRound ? `Round ${snapshot.round}` : 'Lobby'}</Badge>
      </div>
      {inRound ? <RoundStatus progress={progress} /> : <LobbyStatus progress={progress} />}
      {inRound ? (
        <Button onClick={() => onCommand({ type: 'moveOn' })} size="lg" variant="primary">
          Move on
        </Button>
      ) : (
        <div className="flex flex-col gap-1">
          <Button disabled={progress.ready === 0} onClick={() => onCommand({ type: 'start' })} size="lg" variant="primary">
            Start round
          </Button>
          {progress.ready === 0 && <p className="text-sm text-kumo-subtle">No one is ready yet. People join on /participate and tap Start.</p>}
        </div>
      )}
      <Button onClick={() => onCommand({ type: 'reset' })} variant="secondary">
        Reset
      </Button>
      <p className="text-sm text-kumo-subtle">Next round: {describeConfig(snapshot.config)}</p>
    </Surface>
  );
}
