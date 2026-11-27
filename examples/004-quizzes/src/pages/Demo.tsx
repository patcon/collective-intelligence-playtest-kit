import { Loader } from '@cloudflare/kumo';
import { RoomStatusBadge } from '@playtest-kit/ui';
import { QuizControls } from '../demo/QuizControls.tsx';
import { hostRoom } from '../room/client.ts';
import { ROOM } from '../room/protocol.ts';
import { useRoomSnapshot } from '../room/useRoomSnapshot.ts';

const { RoomProvider, useRoomSend, useRoomStatus } = hostRoom;

function HostView() {
  const status = useRoomStatus();
  const send = useRoomSend();
  const snapshot = useRoomSnapshot();

  return (
    <main className="mx-auto flex min-h-screen max-w-400 flex-col gap-4 p-4">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Quizzes</h1>
          <RoomStatusBadge status={status} />
        </div>
        <p className="max-w-2xl text-sm text-kumo-subtle">
          A room takes a personality quiz together (the IPIP Big-Five Factor Markers), and everyone’s answers fill in live.
        </p>
      </header>
      {snapshot ? (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          <QuizControls
            onConfig={(config) => send({ config, type: 'config' })}
            onReset={() => send({ type: 'reset' })}
            onStart={() => send({ type: 'start' })}
            snapshot={snapshot}
          />
        </div>
      ) : (
        <Loader />
      )}
    </main>
  );
}

/** `/demo`: the room, as the host running it. */
export function Demo() {
  return (
    <RoomProvider role="host" room={ROOM}>
      <HostView />
    </RoomProvider>
  );
}
