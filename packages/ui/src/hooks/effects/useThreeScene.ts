import type { RefObject } from 'react';
import { useEffect, useEffectEvent } from 'react';

/**
 * Builds a scene in the mounted element once it has a size, and tears it down
 * on unmount. `init` returns its own cleanup. It runs once per mount, and the
 * latest render's `init` is the one called.
 */
export default function useThreeScene(
  mountRef: RefObject<HTMLDivElement | null>,
  init: (mount: HTMLDivElement) => () => void,
) {
  const onReady = useEffectEvent(init);
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }
    let cleanup: (() => void) | undefined;
    if (mount.clientWidth > 0 && mount.clientHeight > 0) {
      cleanup = onReady(mount);
    } else {
      const ro = new ResizeObserver(() => {
        if (mount.clientWidth > 0 && mount.clientHeight > 0) {
          ro.disconnect();
          cleanup = onReady(mount);
        }
      });
      ro.observe(mount);
      cleanup = () => ro.disconnect();
    }
    return () => cleanup?.();
  }, [mountRef]);
}
