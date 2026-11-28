import { useEffect, useEffectEvent } from 'react';

/** Calls `callback` every `ms` milliseconds, always the latest one; `null` stops it. */
export function useInterval(callback: () => void, ms: number | null): void {
  const run = useEffectEvent(callback);
  useEffect(() => {
    if (ms === null) {
      return undefined;
    }
    const timer = setInterval(() => run(), ms);
    return () => clearInterval(timer);
  }, [ms]);
}
