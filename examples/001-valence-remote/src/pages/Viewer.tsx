import { RoomProvider } from '../room/RoomProvider.tsx';
import { ViewerDashboard } from '../viewer/ViewerDashboard.tsx';

/** `/`: watches what every phone in the room sends. */
export function Viewer({ room }: { room: string }) {
  return (
    <RoomProvider role="viewer" room={room}>
      <ViewerDashboard room={room} />
    </RoomProvider>
  );
}
