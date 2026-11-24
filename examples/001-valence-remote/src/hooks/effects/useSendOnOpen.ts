import { useEffect, useEffectEvent } from 'react';
import { useRoomSend, useRoomStatus } from '../../room/RoomProvider.tsx';
import type { RoomMessage } from '../../room/protocol.ts';

/**
 * Keeps the room up to date with `msg`: sends it whenever its content changes while the socket is
 * open, and again each time the socket (re)opens, since the room forgets a connection when it closes.
 */
export function useSendOnOpen(msg: RoomMessage | null): void {
  const status = useRoomStatus();
  const send = useRoomSend();
  const sendLatest = useEffectEvent(() => msg && send(msg));
  const content = msg && JSON.stringify(msg);

  useEffect(() => {
    if (status === 'open' && content !== null) {
      sendLatest();
    }
  }, [status, content]);
}
