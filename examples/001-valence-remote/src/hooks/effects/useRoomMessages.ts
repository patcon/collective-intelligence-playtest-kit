import { useEffect, useEffectEvent } from 'react';
import { useRoom } from '../../room/RoomProvider.tsx';
import type { RoomMessage } from '../../room/protocol.ts';

/** Calls `callback` with every message the room sends, always the latest callback passed. */
export function useRoomMessages(callback: (msg: RoomMessage) => void): void {
  const { subscribers } = useRoom();
  const onMessage = useEffectEvent(callback);

  useEffect(() => {
    const subscriber = (msg: RoomMessage) => onMessage(msg);
    subscribers.add(subscriber);
    return () => {
      subscribers.delete(subscriber);
    };
  }, [subscribers]);
}
