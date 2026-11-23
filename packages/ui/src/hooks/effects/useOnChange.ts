import { useEffect, useEffectEvent } from 'react';

/** Calls `onChange(value)` after mount and after every commit that changed `value` (by `Object.is`). */
export default function useOnChange<T>(value: T, onChange: (value: T) => void) {
  const fire = useEffectEvent(onChange);
  useEffect(() => {
    fire(value);
  }, [value]);
}
