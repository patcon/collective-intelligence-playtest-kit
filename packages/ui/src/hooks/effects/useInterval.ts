import { useEffect, useEffectEvent } from 'react';

/** Calls the latest `callback` every `ms` milliseconds while mounted. */
export default function useInterval(callback: () => void, ms: number) {
  const tick = useEffectEvent(callback);
  useEffect(() => {
    const id = setInterval(() => tick(), ms);
    return () => clearInterval(id);
  }, [ms]);
}
