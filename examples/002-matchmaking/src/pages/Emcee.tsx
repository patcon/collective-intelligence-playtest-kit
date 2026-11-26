import { Loader } from '@cloudflare/kumo';
import { RoomStatusBadge } from '@playtest-kit/ui';
import { EmceePane } from '../demo/EmceePane.tsx';
import { hostRoom } from '../room/client.ts';
import { useRoomSnapshot } from '../room/useRoomSnapshot.ts';

const { RoomProvider, useRoomSend, useRoomStatus } = hostRoom;

function EmceeView() {
  const status = useRoomStatus();
  const send = useRoomSend();
  const snapshot = useRoomSnapshot();

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col bg-kumo-base">
      {status === 'open' ? null : (
        <div className="px-5 pt-5">
          <RoomStatusBadge status={status} />
        </div>
      )}
      {snapshot ? (
        <EmceePane onCommand={send} snapshot={snapshot} />
      ) : (
        <div className="grid flex-1 place-items-center">
          <Loader />
        </div>
      )}
    </main>
  );
}

/**
 * `/emcee`: the emcee's controls on their own, for running the room from a phone. It connects as a
 * host, like `/demo`, so both can be open at once; config and simulated participants stay on `/demo`.
 */
export function Emcee({ room }: { room: string }) {
  return (
    <RoomProvider role="host" room={room}>
      <EmceeView />
    </RoomProvider>
  );
}
