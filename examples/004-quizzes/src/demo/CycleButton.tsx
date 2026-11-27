import { Button } from '@cloudflare/kumo';

interface CycleButtonProps<T extends string> {
  /** What it sets, shown before the current option, such as "View". */
  label: string;
  options: ReadonlyArray<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
}

/** A small button showing an option, which steps to the next one (wrapping round) on each press. */
export function CycleButton<T extends string>({ label, options, value, onChange }: CycleButtonProps<T>) {
  const i = options.findIndex((option) => option.value === value);
  const next = options[(i + 1) % options.length];
  return (
    <Button onClick={() => next && onChange(next.value)} size="sm" variant="secondary">
      {label}: {options[i]?.label}
    </Button>
  );
}
