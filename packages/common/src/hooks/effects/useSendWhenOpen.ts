import { useEffect, useEffectEvent } from 'react';

/**
 * Keeps a room up to date with `msg`: sends it whenever its content changes while `open`, and again
 * each time the socket (re)opens, since a room forgets a connection when it closes.
 */
export function useSendWhenOpen<T>(open: boolean, send: (msg: T) => void, msg: T | null): void {
  const sendLatest = useEffectEvent(() => msg !== null && send(msg));
  const content = msg === null ? null : JSON.stringify(msg);

  useEffect(() => {
    if (open && content !== null) {
      sendLatest();
    }
  }, [open, content]);
}
