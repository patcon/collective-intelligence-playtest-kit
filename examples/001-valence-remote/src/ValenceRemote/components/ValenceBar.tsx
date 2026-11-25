import type { AxisLabels } from '../lib/axisLabels.ts';
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

const TRACK: Record<BarPosition, string> = {
  left: 'relative w-1',
  top: 'relative h-1',
};

/** Both fills, stacked in the track from its negative end. */
const FILL: Record<BarPosition, string> = {
  left: 'absolute inset-x-0 bottom-0 transition-[height]',
  top: 'absolute inset-y-0 left-0 transition-[width]',
};

/** A stretch of the track between two valences. */
const SPAN: Record<BarPosition, string> = {
  left: 'absolute inset-x-0',
  top: 'absolute inset-y-0',
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
  /** The valence snapped to the levels sent, for the bright fill; `valence` when not given. */
  snapped?: number | null;
}

/** How far along the track a valence reaches, as a percentage; none with no valence. */
function shareOf(valence: number | null): number {
  return valence === null ? 0 : ((valence + 1) / 2) * 100;
}

function extent(position: BarPosition, valence: number | null) {
  const share = `${shareOf(valence)}%`;
  return position === 'top' ? { width: share } : { height: share };
}

/** The stretch of the track from `from` up to `to`. */
function span(position: BarPosition, from: number, to: number) {
  const start = `${shareOf(from)}%`;
  const length = `${shareOf(to) - shareOf(from)}%`;
  return position === 'top' ? { left: start, width: length } : { bottom: start, height: length };
}

/**
 * A thin line along one edge, like an article's reading progress: filled as far as the valence
 * goes, empty at −1 and full at +1, with any labels beside it. Empty with no valence. The bright
 * fill snaps to the level sent; the raw reading shows as a fainter fill past it, or as a shade
 * over its end where the reading falls short of it.
 */
export function ValenceBar({ valence, snapped = valence, idle = false, position = 'top', labels }: ValenceBarProps) {
  const ink = inkFor(idle);
  // Fades only into no valence, as the screen does, so it otherwise keeps up with the reading.
  const fade = valence === null ? 'duration-300' : 'duration-0';
  const shortfall = valence !== null && snapped !== null && valence < snapped;

  return (
    <div aria-hidden className={`pointer-events-none absolute ${ink.shadow} ${STRIP[position]}`}>
      <div className={`${ink.track} ${TRACK[position]}`}>
        <div className={`${ink.dimFill} ${FILL[position]} ${fade}`} style={extent(position, valence)} />
        <div className={`${ink.fill} ${FILL[position]} ${fade}`} style={extent(position, snapped)} />
        {shortfall && <div className={`${ink.shortfall} ${SPAN[position]}`} style={span(position, valence, snapped)} />}
      </div>
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
