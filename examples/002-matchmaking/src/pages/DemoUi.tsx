import { Button, Loader, Surface } from '@cloudflare/kumo';
import { RoomStatusBadge } from '@playtest-kit/ui';
import { useState } from 'react';
import { hostRoom } from '../room/client.ts';
import type { RoomSnapshot } from '../room/protocol.ts';

const { RoomProvider, useRoomMessages, useRoomSend, useRoomStatus } = hostRoom;

/**
 * Just enough to drive a round while `/participate` is built: the phase, counts, and the round
 * controls. `EmceePane` replaces it.
 */
function RoundControls({ snapshot }: { snapshot: RoomSnapshot }) {
  const send = useRoomSend();
  const ready = snapshot.participants.filter((p) => p.status === 'waiting').length;
  const groupsFound = snapshot.groups.filter((g) => g.found > 0).length;
  const inRound = snapshot.phase === 'round';

  return (
    <>
      <p>
        {inRound ? `Round ${snapshot.round} · ${groupsFound} of ${snapshot.groups.length} groups found` : `Lobby · ${ready} ready`}
      </p>
      <div className="flex gap-2">
        <Button disabled={inRound || ready === 0} onClick={() => send({ type: 'start' })} variant="primary">
          Start round
        </Button>
        <Button disabled={!inRound} onClick={() => send({ type: 'moveOn' })}>
          Move on
        </Button>
        <Button onClick={() => send({ type: 'reset' })} variant="secondary">
          Reset
        </Button>
      </div>
      <ul className="text-sm text-kumo-subtle">
        {snapshot.participants.map((p) => (
          <li key={p.id}>
            {p.id.slice(0, 4)} · {p.status}
            {p.group === null ? '' : ` · ${snapshot.groups[p.group]?.cue.name ?? ''}`}
          </li>
        ))}
      </ul>
    </>
  );
}

function HostView() {
  const status = useRoomStatus();
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  useRoomMessages((msg) => setSnapshot(msg.snapshot));

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 p-4">
      <Surface className="flex flex-col gap-4 rounded-lg p-6">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">Matchmaking</h1>
          <RoomStatusBadge status={status} />
        </div>
        {snapshot ? <RoundControls snapshot={snapshot} /> : <Loader />}
        <a className="text-sm text-kumo-link underline" href="/participate" rel="noreferrer" target="_blank">
          Open /participate
        </a>
      </Surface>
    </main>
  );
}

/** `/demo-ui`: the room, as the host running it. */
export function DemoUi({ room }: { room: string }) {
  return (
    <RoomProvider role="host" room={room}>
      <HostView />
    </RoomProvider>
  );
}
