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
  left: 'relative flex w-1 flex-col-reverse',
  top: 'relative h-1',
};

/** A tick across the bar, centred on its value and standing a little past the track. */
const TICK: Record<BarPosition, string> = {
  left: 'absolute left-0 h-px w-2 translate-y-1/2',
  top: 'absolute top-0 h-2 w-px -translate-x-1/2',
};

const FILL: Record<BarPosition, string> = {
  left: 'w-full transition-[height]',
  top: 'h-full transition-[width]',
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
  /** Valences to mark with a tick, as the levels a coarse remote sends. */
  ticks?: ReadonlyArray<number>;
}

function shareOf(valence: number): string {
  return `${((valence + 1) / 2) * 100}%`;
}

/**
 * A thin line along one edge, like an article's reading progress: filled as far as the valence
 * goes, empty at −1 and full at +1, with any ticks across it and labels beside it. Empty with no valence.
 */
export function ValenceBar({ valence, idle = false, position = 'top', labels, ticks = [] }: ValenceBarProps) {
  const ink = inkFor(idle);
  const share = shareOf(valence ?? -1);
  // Fades only into no valence, as the screen does, so it otherwise keeps up with the reading.
  const fade = valence === null ? 'duration-300' : 'duration-0';

  return (
    <div aria-hidden className={`pointer-events-none absolute ${ink.shadow} ${STRIP[position]}`}>
      <div className={`${ink.track} ${TRACK[position]}`}>
        <div
          className={`${ink.fill} ${FILL[position]} ${fade}`}
          style={position === 'top' ? { width: share } : { height: share }}
        />
        {ticks.map((tick) => (
          <div
            className={`${ink.fill} ${TICK[position]}`}
            key={tick}
            style={position === 'top' ? { left: shareOf(tick) } : { bottom: shareOf(tick) }}
          />
        ))}
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
