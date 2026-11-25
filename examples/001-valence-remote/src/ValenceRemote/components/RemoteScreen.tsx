import { Banner, LayerCard, Text } from '@cloudflare/kumo';
import type { PointerEvent, ReactNode } from 'react';
import type { AxisLabels } from '../lib/axisLabels.ts';
import { formatValence, valenceColor } from '../lib/valenceColor.ts';
import { inkFor } from './ink.ts';
import { ValenceBar } from './ValenceBar.tsx';
import type { BarPosition } from './ValenceBar.tsx';

interface RemoteScreenProps {
  valence: number | null;
  /** The valence snapped to the levels sent, for the bar's bright fill; `valence` when not given. */
  snapped?: number | null;
  /** Show the valence as a number in the middle. */
  showNumeric?: boolean;
  /** Which edge the valence bar runs along. */
  barPosition?: BarPosition;
  /** Words beside the bar's ends (and middle), or none. */
  axisLabels?: AxisLabels | null;
  /** Fill with the idle colour (see `valenceColor`). */
  idle?: boolean;
  instruction: string;
  /** Shown in place of the instruction card: a picture, tinted to sit over the colour behind it. */
  illustration?: ReactNode;
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

/** Where the corners sit, clear of the bar's labels when they run along that corner's edge. */
type Clearance = 'none' | BarPosition;

const BADGES_INSET: Record<Clearance, string> = {
  left: 'pt-[max(1rem,env(safe-area-inset-top))] pl-[calc(max(1rem,env(safe-area-inset-left))+1.25rem)]',
  none: 'pt-[max(1rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))]',
  top: 'pt-[calc(max(1rem,env(safe-area-inset-top))+1.25rem)] pl-[max(1rem,env(safe-area-inset-left))]',
};

const CONTROLS_INSET: Record<Clearance, string> = {
  left: 'pt-[max(1rem,env(safe-area-inset-top))]',
  none: 'pt-[max(1rem,env(safe-area-inset-top))]',
  top: 'pt-[calc(max(1rem,env(safe-area-inset-top))+1.25rem)]',
};

function share(event: PointerEvent<HTMLDivElement>): number {
  const rect = event.currentTarget.getBoundingClientRect();
  return Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
}

/**
 * The running remote: the whole screen in the valence's colour, a thin bar along one edge for where
 * it sits from −1 to +1 (with any axis labels), any badges top left and controls top right, an optional readout,
 * the instruction on a card (or an illustration in its place), and any notes as banners.
 */
export function RemoteScreen({
  valence,
  snapped = valence,
  showNumeric = false,
  barPosition = 'top',
  axisLabels,
  idle = false,
  instruction,
  illustration,
  notes,
  badges,
  controls,
  onPointer,
  onRelease,
  children,
}: RemoteScreenProps) {
  const clearance: Clearance = axisLabels ? barPosition : 'none';
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
      <ValenceBar idle={idle} labels={axisLabels} position={barPosition} snapped={snapped} valence={valence} />
      {children}
      {badges && (
        <div className={`pointer-events-none absolute top-0 left-0 p-4 ${BADGES_INSET[clearance]}`}>
          <LayerCard className="flex items-center gap-2 rounded-full px-3 py-1.5">{badges}</LayerCard>
        </div>
      )}
      {controls && (
        <div
          className={`absolute top-0 right-0 p-4 pr-[max(1rem,env(safe-area-inset-right))] ${CONTROLS_INSET[clearance]}`}
          onPointerDown={stop}
          onPointerMove={stop}
          onPointerUp={stop}
        >
          {controls}
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
        {/* The readout hangs above the instruction, so showing it doesn't move the instruction. */}
        <div className="relative">
          {showNumeric && (
            <output
              aria-label="Valence"
              className={`absolute bottom-full left-1/2 mb-3 -translate-x-1/2 font-mono text-5xl whitespace-nowrap tabular-nums ${inkFor(idle).picture}`}
            >
              {formatValence(valence)}
            </output>
          )}
          {illustration ?? (
            <LayerCard className="max-w-sm rounded-lg bg-kumo-base/85 px-4 py-2 backdrop-blur">
              <Text>{instruction}</Text>
            </LayerCard>
          )}
        </div>
        {notes.map((note) => (
          <Banner className="max-w-sm text-left" description={note} key={note} variant="alert" />
        ))}
      </div>
    </div>
  );
}
