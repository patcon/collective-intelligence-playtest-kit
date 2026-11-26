import { useEffect, useEffectEvent } from 'react';

/** Calls `onChange(value)` on mount and whenever `value` changes (by `Object.is`). */
export function useOnChange<T>(value: T, onChange: ((value: T) => void) | undefined): void {
  const report = useEffectEvent((next: T) => onChange?.(next));

  useEffect(() => {
    report(value);
  }, [value]);
}
