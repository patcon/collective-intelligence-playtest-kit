import { Loader } from '@cloudflare/kumo';
import { RoomStatusBadge } from '@playtest-kit/ui';
import { useState } from 'react';
import { ConfigPanels } from '../demo/ConfigPanels.tsx';
import { EmceePane } from '../demo/EmceePane.tsx';
import { JoinPanel } from '../demo/JoinPanel.tsx';
import { repeatWarning } from '../demo/repeatWarning.ts';
import { hostRoom } from '../room/client.ts';
import type { RoomSnapshot } from '../room/protocol.ts';

const { RoomProvider, useRoomMessages, useRoomSend, useRoomStatus } = hostRoom;

function Columns({ snapshot }: { snapshot: RoomSnapshot }) {
  const send = useRoomSend();
  return (
    <div className="grid items-start gap-4 lg:grid-cols-3">
      <ConfigPanels config={snapshot.config} onConfig={(config) => send({ config, type: 'config' })} warning={repeatWarning(snapshot)} />
      <EmceePane onCommand={send} snapshot={snapshot} />
      <JoinPanel />
    </div>
  );
}

function HostView() {
  const status = useRoomStatus();
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  useRoomMessages((msg) => setSnapshot(msg.snapshot));

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 p-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Matchmaking</h1>
        <RoomStatusBadge status={status} />
      </header>
      {snapshot ? <Columns snapshot={snapshot} /> : <Loader />}
    </main>
  );
}

/**
 * `/demo-ui`: the room, as the host running it. Config on the left, the emcee's pane in the middle,
 * and the QR code to join on the right.
 */
export function DemoUi({ room }: { room: string }) {
  return (
    <RoomProvider role="host" room={room}>
      <HostView />
    </RoomProvider>
  );
}
