import { RoomProvider } from '../room/client.ts';
import { ViewerDashboard } from '../viewer/ViewerDashboard.tsx';

/** `/`: watches what every phone in the room sends. */
export function Viewer({ room }: { room: string }) {
  return (
    <RoomProvider role="viewer" room={room}>
      <ViewerDashboard room={room} />
    </RoomProvider>
  );
}
