import type { AxisLabels } from '../lib/axisLabels.ts';
import { BarTracks } from './BarTracks.tsx';
import type { BarVariant } from './BarTracks.tsx';
import { inkFor } from './ink.ts';

/** Which edge the bar runs along: `top` fills left to right, `left` bottom to top (as touch reads). */
export type BarPosition = 'top' | 'left';

export const BAR_POSITIONS: ReadonlyArray<BarPosition> = ['top', 'left'];

export function isBarPosition(value: unknown): value is BarPosition {
  return BAR_POSITIONS.some((position) => position === value);
}

/** The bar and its labels, as a strip along the edge. */
const STRIP: Record<BarPosition, string> = {
  left: 'inset-y-0 left-[env(safe-area-inset-left)] flex',
  top: 'inset-x-0 top-[env(safe-area-inset-top)] flex flex-col',
};

/**
 * Negative, middle and positive on a grid whose middle track is centred on the bar, whatever the
 * ends' lengths. Left runs bottom to top, its words reading upwards.
 */
const LABELS: Record<BarPosition, string> = {
  left: 'grid grid-rows-[1fr_auto_1fr] py-2 pl-1 [&>*]:rotate-180 [&>*]:[writing-mode:vertical-rl]',
  top: 'grid grid-cols-[1fr_auto_1fr] px-2 pt-0.5',
};

const ENDS: Record<BarPosition, { negative: string; positive: string }> = {
  left: { negative: 'row-start-3 self-end', positive: 'row-start-1 self-start' },
  top: { negative: 'col-start-1 justify-self-start', positive: 'col-start-3 justify-self-end' },
};

const MIDDLE: Record<BarPosition, string> = { left: 'row-start-2', top: 'col-start-2' };

interface ValenceBarProps {
  valence: number | null;
  /** On the idle colour (see `valenceColor`). */
  idle?: boolean;
  position?: BarPosition;
  /** Words beside the bar's ends (and middle), or none. */
  labels?: AxisLabels | null;
  /** The valence snapped to the levels sent; `valence` when not given. */
  snapped?: number | null;
  /** How the raw reading shows against the level sent (see `BarVariant`). */
  variant?: BarVariant;
}

/**
 * A thin line along one edge, like an article's reading progress: filled as far as the valence
 * goes, empty at −1 and full at +1, with any labels beside it. Empty with no valence. Its variant
 * decides how the raw reading and the level sent each show.
 */
export function ValenceBar({
  valence,
  snapped = valence,
  idle = false,
  position = 'top',
  labels,
  variant = 'continuous',
}: ValenceBarProps) {
  const ink = inkFor(idle);

  return (
    <div aria-hidden className={`pointer-events-none absolute ${ink.shadow} ${STRIP[position]}`}>
      <BarTracks ink={ink} position={position} snapped={snapped} valence={valence} variant={variant} />
      {labels && (
        <div className={`text-xs/4 font-medium ${ink.text} ${LABELS[position]}`}>
          <span className={ENDS[position].negative}>{labels.negative}</span>
          {labels.neutral && <span className={MIDDLE[position]}>{labels.neutral}</span>}
          <span className={ENDS[position].positive}>{labels.positive}</span>
        </div>
      )}
    </div>
  );
}
