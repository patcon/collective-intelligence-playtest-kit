import { Banner, LayerCard, Text } from '@cloudflare/kumo';
import type { PointerEvent, ReactNode } from 'react';
import { formatValence, valenceColor } from '../lib/valenceColor.ts';

interface RemoteScreenProps {
  valence: number | null;
  /** Fill with the idle colour (see `valenceColor`). */
  idle?: boolean;
  instruction: string;
  notes: Array<string>;
  /** Badges for the top-left corner, or none. */
  badges?: ReactNode;
  onPointer?: (y: number, event: PointerEvent<HTMLDivElement>) => void;
  /** A finger lifted, or the browser took the pointer away. */
  onRelease?: () => void;
  children?: ReactNode;
}

function share(event: PointerEvent<HTMLDivElement>): number {
  const rect = event.currentTarget.getBoundingClientRect();
  return Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
}

/**
 * The running remote: the whole screen in the valence's colour, with any badges top left, a readout,
 * the instruction on a card, and any notes as banners.
 */
export function RemoteScreen({
  valence,
  idle = false,
  instruction,
  notes,
  badges,
  onPointer,
  onRelease,
  children,
}: RemoteScreenProps) {
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
      style={{ backgroundColor: valenceColor(valence, idle) }}
    >
      {children}
      {badges && (
        <div className="pointer-events-none absolute top-0 left-0 p-4 pt-[max(1rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))]">
          <LayerCard className="flex items-center gap-2 rounded-full px-3 py-1.5">{badges}</LayerCard>
        </div>
      )}
      {/* Centred without a transform: one would isolate the readout's blend from the colour behind. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <output aria-label="Valence" className="font-mono text-5xl tabular-nums mix-blend-difference">
          {formatValence(valence)}
        </output>
        <LayerCard className="max-w-sm rounded-lg bg-kumo-base/85 px-4 py-2 backdrop-blur">
          <Text>{instruction}</Text>
        </LayerCard>
        {notes.map((note) => (
          <Banner className="max-w-sm text-left" description={note} key={note} variant="alert" />
        ))}
      </div>
    </div>
  );
}
