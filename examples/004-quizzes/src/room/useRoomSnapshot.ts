import { useState } from 'react';
import { hostRoom } from './client.ts';
import type { RoomSnapshot } from './protocol.ts';

/** The room as the host last heard it, or null before the first snapshot. Use inside `hostRoom.RoomProvider`. */
export function useRoomSnapshot(): RoomSnapshot | null {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  hostRoom.useRoomMessages((msg) => setSnapshot(msg.snapshot));
  return snapshot;
}
