import { Banner, LayerCard, Text } from '@cloudflare/kumo';
import type { PointerEvent, ReactNode } from 'react';
import { formatValence, valenceColor } from '../lib/valenceColor.ts';
import { ValenceBar } from './ValenceBar.tsx';
import type { BarPosition } from './ValenceBar.tsx';

interface RemoteScreenProps {
  valence: number | null;
  /** Show the valence as a number in the middle. */
  showNumeric?: boolean;
  /** Which edge the valence bar runs along. */
  barPosition?: BarPosition;
  /** Fill with the idle colour (see `valenceColor`). */
  idle?: boolean;
  instruction: string;
  notes: Array<string>;
  /** Badges for the top-left corner, or none. */
  badges?: ReactNode;
  /** Controls for the top-right corner, or none. Pointers on them don't reach `onPointer`. */
  controls?: ReactNode;
  onPointer?: (y: number, event: PointerEvent<HTMLDivElement>) => void;
  /** A finger lifted, or the browser took the pointer away. */
  onRelease?: () => void;
  children?: ReactNode;
}

/** Keeps a pointer on the controls from reading as touch. */
function stop(event: PointerEvent) {
  event.stopPropagation();
}

function share(event: PointerEvent<HTMLDivElement>): number {
  const rect = event.currentTarget.getBoundingClientRect();
  return Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
}

/**
 * The running remote: the whole screen in the valence's colour, a thin bar along one edge for where
 * it sits from −1 to +1, any badges top left and controls top right, an optional readout,
 * the instruction on a card, and any notes as banners.
 */
export function RemoteScreen({
  valence,
  showNumeric = false,
  barPosition = 'top',
  idle = false,
  instruction,
  notes,
  badges,
  controls,
  onPointer,
  onRelease,
  children,
}: RemoteScreenProps) {
  const handle = (event: PointerEvent<HTMLDivElement>) => onPointer?.(share(event), event);
  // Fades only into no valence or idle: CSS takes the transition from the new state, so the colour
  // still follows a moving finger or tilt at once.
  const fade = valence === null || idle ? 'transition-colors duration-300' : '';

  return (
    <div
      className={`fixed inset-0 touch-none text-white select-none ${fade}`}
      data-testid="valence-remote"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={handle}
      onPointerCancel={onRelease}
      onPointerMove={handle}
      onPointerUp={onRelease}
      style={{ backgroundColor: valenceColor(valence, idle) }}
    >
      <ValenceBar position={barPosition} valence={valence} />
      {children}
      {badges && (
        <div className="pointer-events-none absolute top-0 left-0 p-4 pt-[max(1rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))]">
          <LayerCard className="flex items-center gap-2 rounded-full px-3 py-1.5">{badges}</LayerCard>
        </div>
      )}
      {controls && (
        <div
          className="absolute top-0 right-0 p-4 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))]"
          onPointerDown={stop}
          onPointerMove={stop}
          onPointerUp={stop}
        >
          {controls}
        </div>
      )}
      {/* Centred without a transform: one would isolate the readout's blend from the colour behind. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
        {showNumeric && (
          <output aria-label="Valence" className="font-mono text-5xl tabular-nums mix-blend-difference">
            {formatValence(valence)}
          </output>
        )}
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
