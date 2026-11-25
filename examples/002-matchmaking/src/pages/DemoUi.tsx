import { Loader } from '@cloudflare/kumo';
import { RoomStatusBadge } from '@playtest-kit/ui';
import { useState } from 'react';
import { EmceePane } from '../demo/EmceePane.tsx';
import { hostRoom } from '../room/client.ts';
import type { RoomSnapshot } from '../room/protocol.ts';

const { RoomProvider, useRoomMessages, useRoomSend, useRoomStatus } = hostRoom;

function HostView() {
  const status = useRoomStatus();
  const send = useRoomSend();
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  useRoomMessages((msg) => setSnapshot(msg.snapshot));

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 p-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Matchmaking</h1>
        <RoomStatusBadge status={status} />
      </header>
      {snapshot ? <EmceePane onCommand={send} snapshot={snapshot} /> : <Loader />}
      <a className="text-sm text-kumo-link underline" href="/participate" rel="noreferrer" target="_blank">
        Open /participate
      </a>
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
