import { useEffect, useEffectEvent } from 'react';

/** Calls `callback` every `ms` while `active`, always the latest one passed. */
export function useInterval(callback: () => void, ms: number, active = true): void {
  const tick = useEffectEvent(callback);

  useEffect(() => {
    if (!active) {
      return;
    }
    const id = setInterval(() => tick(), ms);
    return () => clearInterval(id);
  }, [active, ms]);
}
