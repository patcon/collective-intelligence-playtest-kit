import { useEffect, useState } from 'react';

/** The content-box size of the element in `element`, kept up to date as it resizes; null until measured. */
export function useElementSize(element: HTMLElement | null): { height: number; width: number } | null {
  const [size, setSize] = useState<{ height: number; width: number } | null>(null);
  useEffect(() => {
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) {
        return;
      }
      const { height, width } = entry.contentRect;
      setSize((last) => (last?.height === height && last.width === width ? last : { height, width }));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return element ? size : null;
}
