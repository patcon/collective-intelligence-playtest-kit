import { useEffect, useEffectEvent } from 'react';

/** Adds `callback` to `subscribers` while mounted, always calling the latest one passed. */
export function useSubscriber<T>(subscribers: Set<(value: T) => void>, callback: (value: T) => void): void {
  const onValue = useEffectEvent(callback);

  useEffect(() => {
    const subscriber = (value: T) => onValue(value);
    subscribers.add(subscriber);
    return () => {
      subscribers.delete(subscriber);
    };
  }, [subscribers]);
}
