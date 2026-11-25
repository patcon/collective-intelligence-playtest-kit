import { useEffect, useEffectEvent } from 'react';

/**
 * Calls `onChange(visible)` when the page goes out of view (another tab or app, a call, the screen
 * locking: `visibilitychange`; navigating away: `pagehide`) or back into it (`visibilitychange`, or
 * `pageshow` on a return from the back/forward cache). Only changes are reported, not the page's
 * visibility on mount, and each change only once though several events may announce it.
 */
export function usePageVisibility(enabled: boolean, onChange: (visible: boolean) => void) {
  const report = useEffectEvent(onChange);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let visible = document.visibilityState === 'visible';
    const set = (next: boolean) => {
      if (next !== visible) {
        visible = next;
        report(next);
      }
    };
    const onVisibility = () => set(document.visibilityState === 'visible');
    const onPageHide = () => set(false);
    const onPageShow = (event: PageTransitionEvent) => event.persisted && onVisibility();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [enabled]);
}
