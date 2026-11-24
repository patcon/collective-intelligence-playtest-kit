import { useEffect, useState } from 'react';

/**
 * Keeps the screen awake while `active`. Takes the lock again when the tab comes back into view,
 * since browsers drop it whenever the tab is hidden. `supported` is false where the API is missing
 * (older browsers, and pages that aren't secure).
 */
export function useWakeLock(active: boolean) {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const [acquired, setAcquired] = useState(false);

  useEffect(() => {
    if (!active || !supported) {
      return;
    }
    let sentinel: WakeLockSentinel | null = null;
    let disposed = false;

    const acquire = async () => {
      if (sentinel || document.visibilityState !== 'visible') {
        return;
      }
      try {
        const next = await navigator.wakeLock.request('screen');
        if (disposed) {
          await next.release();
          return;
        }
        sentinel = next;
        setAcquired(true);
        next.addEventListener('release', () => {
          sentinel = null;
          setAcquired(false);
        });
      } catch {
        // Refused (low battery, power saving): the screen may sleep, which `acquired` reports.
        setAcquired(false);
      }
    };

    const onVisibilityChange = () => {
      void acquire();
    };
    onVisibilityChange();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void sentinel?.release();
      setAcquired(false);
    };
  }, [active, supported]);

  return { acquired: active && acquired, supported };
}
