import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';

/** A ref holding the last committed `value`, for code that runs outside render (animation loops, listeners). */
export default function useLatestRef<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
