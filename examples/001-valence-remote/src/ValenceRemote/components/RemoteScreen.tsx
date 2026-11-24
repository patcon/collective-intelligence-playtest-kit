import type { PointerEvent, ReactNode } from 'react';
import { formatValence, valenceColor } from '../lib/valenceColor.ts';

interface RemoteScreenProps {
  valence: number | null;
  /** Grey out the fill, as when idle. */
  grey?: boolean;
  instruction: string;
  notes: Array<string>;
  onPointer?: (y: number, event: PointerEvent<HTMLDivElement>) => void;
  /** A finger lifted, or the browser took the pointer away. */
  onRelease?: () => void;
  children?: ReactNode;
}

function share(event: PointerEvent<HTMLDivElement>): number {
  const rect = event.currentTarget.getBoundingClientRect();
  return Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
}

/** The running remote: the whole screen in the valence's colour, with −1/+1 labels and a readout. */
export function RemoteScreen({ valence, grey = false, instruction, notes, onPointer, onRelease, children }: RemoteScreenProps) {
  const handle = (event: PointerEvent<HTMLDivElement>) => onPointer?.(share(event), event);

  return (
    <div
      className="fixed inset-0 touch-none text-white select-none"
      data-testid="valence-remote"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={handle}
      onPointerCancel={onRelease}
      onPointerMove={handle}
      onPointerUp={onRelease}
      style={{ backgroundColor: valenceColor(valence, grey) }}
    >
      {children}
      <span className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 font-mono text-lg mix-blend-difference">
        +1
      </span>
      <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-lg mix-blend-difference">
        −1
      </span>
      <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center gap-2 px-6 text-center mix-blend-difference">
        <output aria-label="Valence" className="font-mono text-5xl tabular-nums">
          {formatValence(valence)}
        </output>
        <p>{instruction}</p>
        {notes.map((note) => (
          <p className="text-sm" key={note}>
            {note}
          </p>
        ))}
      </div>
    </div>
  );
}
