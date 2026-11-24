import { RoomProvider, useRoomSend } from '../room/RoomProvider.tsx';
import { ValenceRemote } from '../ValenceRemote/ValenceRemote.tsx';
import { isDetection } from '../ValenceRemote/lib/valence.ts';

function detectionFromUrl() {
  const param = new URLSearchParams(window.location.search).get('detection');
  return isDetection(param) ? param : 'flip';
}

function ConnectedRemote() {
  const send = useRoomSend();
  return <ValenceRemote detection={detectionFromUrl()} onValence={(v) => send({ type: 'valence', v })} />;
}

/** `/remote`: this device as a phone in the room. `?detection=` picks the mode (default `flip`). */
export function Remote({ room }: { room: string }) {
  return (
    <RoomProvider role="phone" room={room}>
      <ConnectedRemote />
    </RoomProvider>
  );
}
