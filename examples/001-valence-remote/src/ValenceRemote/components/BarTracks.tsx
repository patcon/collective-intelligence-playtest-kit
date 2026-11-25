import type { ReactNode } from 'react';
import type { Ink } from './ink.ts';
import type { BarPosition } from './ValenceBar.tsx';

/**
 * How the bar shows the raw reading against the level sent:
 * - `continuous`: one fill, the raw reading only.
 * - `overlay`: one track, a bright fill snapped to the level, the raw reading as a fainter fill past
 *   it or a shade over its end where it falls short.
 * - `double`: two tracks, the snapped one on the outer edge (easing between levels) and the raw
 *   one just inside it.
 */
export type BarVariant = 'continuous' | 'overlay' | 'double';

export const BAR_VARIANTS: ReadonlyArray<BarVariant> = ['continuous', 'overlay', 'double'];

export function isBarVariant(value: unknown): value is BarVariant {
  return BAR_VARIANTS.some((variant) => variant === value);
}

export interface BarTracksProps {
  /** The raw reading, null when it can't tell. */
  valence: number | null;
  /** The reading snapped to the level sent. */
  snapped: number | null;
  position: BarPosition;
  ink: Ink;
}

/** Two tracks side by side, the first on the outer edge. */
const PAIR: Record<BarPosition, string> = {
  left: 'flex gap-px',
  top: 'flex flex-col gap-px',
};

const TRACK: Record<BarPosition, string> = {
  left: 'relative w-1',
  top: 'relative h-1',
};

/** A track's fill, from its negative end. */
const FILL: Record<BarPosition, string> = {
  left: 'absolute inset-x-0 bottom-0 transition-[height]',
  top: 'absolute inset-y-0 left-0 transition-[width]',
};

/** A stretch of a track between two valences. */
const SPAN: Record<BarPosition, string> = {
  left: 'absolute inset-x-0',
  top: 'absolute inset-y-0',
};

/** How far along the track a valence reaches, as a percentage; none with no valence. */
function shareOf(valence: number | null): number {
  return valence === null ? 0 : ((valence + 1) / 2) * 100;
}

function extent(position: BarPosition, valence: number | null) {
  const share = `${shareOf(valence)}%`;
  return position === 'top' ? { width: share } : { height: share };
}

/** The stretch of a track from `from` up to `to`. */
function span(position: BarPosition, from: number, to: number) {
  const start = `${shareOf(from)}%`;
  const length = `${shareOf(to) - shareOf(from)}%`;
  return position === 'top' ? { left: start, width: length } : { bottom: start, height: length };
}

interface FillProps {
  className: string;
  position: BarPosition;
  valence: number | null;
  /** Ease between values at the viewer's pace (see EASE), rather than keep up at once. */
  eased?: boolean;
}

/** How the viewer's bars ease between values: Kumo's `Meter` fill, which they're drawn with. */
const EASE = 'duration-300 ease-out';

/**
 * Fades into no valence, as the screen does. Otherwise keeps up with the reading at once, unless
 * eased, which suits a value that jumps between levels.
 */
function durationFor(valence: number | null, eased: boolean): string {
  if (valence === null) {
    return 'duration-300';
  }
  return eased ? EASE : 'duration-0';
}

function Fill({ className, position, valence, eased = false }: FillProps) {
  return (
    <div className={`${className} ${FILL[position]} ${durationFor(valence, eased)}`} style={extent(position, valence)} />
  );
}

function ContinuousTracks({ valence, position, ink }: BarTracksProps) {
  return (
    <div className={`${ink.track} ${TRACK[position]}`}>
      <Fill className={ink.fill} position={position} valence={valence} />
    </div>
  );
}

function OverlayTracks({ valence, snapped, position, ink }: BarTracksProps) {
  const shortfall = valence !== null && snapped !== null && valence < snapped;
  return (
    <div className={`${ink.track} ${TRACK[position]}`}>
      <Fill className={ink.dimFill} position={position} valence={valence} />
      <Fill className={ink.fill} position={position} valence={snapped} />
      {shortfall && <div className={`${ink.shortfall} ${SPAN[position]}`} style={span(position, valence, snapped)} />}
    </div>
  );
}

function DoubleTracks({ valence, snapped, position, ink }: BarTracksProps) {
  return (
    <div className={PAIR[position]}>
      <div className={`${ink.track} ${TRACK[position]}`}>
        <Fill className={ink.fill} eased position={position} valence={snapped} />
      </div>
      <div className={`${ink.track} ${TRACK[position]}`}>
        <Fill className={ink.dimFill} position={position} valence={valence} />
      </div>
    </div>
  );
}

const TRACKS: Record<BarVariant, (props: BarTracksProps) => ReactNode> = {
  continuous: ContinuousTracks,
  double: DoubleTracks,
  overlay: OverlayTracks,
};

/** The bar's track(s) and fill(s), in the chosen variant. */
export function BarTracks({ variant, ...props }: BarTracksProps & { variant: BarVariant }) {
  const Tracks = TRACKS[variant];
  return <Tracks {...props} />;
}
