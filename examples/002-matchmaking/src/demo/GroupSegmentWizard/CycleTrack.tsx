// A one-option window styled like Kumo's segmented tabs. The pill stays put
// and the labels slide up or down through it, so cycling reads as rolling to the next option.
import type { ReactNode } from 'react';

interface CycleTrackProps {
  labels: ReadonlyArray<string>;
  /** Index of the label showing. */
  at: number;
  /** Height of one row in px: the pill's height. */
  row: number;
  className?: string;
  /** Drawn on the pill, left of the label, and doesn't slide. */
  icon?: ReactNode;
}

export function CycleTrack({ labels, at, row, className = '', icon }: CycleTrackProps) {
  return (
    <span className={`block rounded-lg bg-kumo-recessed p-0.5 ${className}`}>
      <span className="relative flex overflow-hidden rounded-md bg-kumo-base shadow-sm ring ring-kumo-line" style={{ height: row }}>
        {icon && <span className="pointer-events-none absolute inset-y-0 left-2 z-1 flex items-center text-kumo-subtle">{icon}</span>}
        <span
          className="flex w-full flex-col transition-transform duration-200 ease-out motion-reduce:transition-none"
          style={{ transform: `translateY(-${at * row}px)` }}
        >
          {labels.map((label) => (
            <span className={`flex shrink-0 items-center font-medium whitespace-nowrap ${icon ? 'pl-7' : 'justify-center'}`} key={label} style={{ height: row }}>
              {label}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}
