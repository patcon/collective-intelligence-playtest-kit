/** Which edge the bar runs along: `top` fills left to right, `left` bottom to top (as touch reads). */
export type BarPosition = 'top' | 'left';

export const BAR_POSITIONS: ReadonlyArray<BarPosition> = ['top', 'left'];

export function isBarPosition(value: unknown): value is BarPosition {
  return BAR_POSITIONS.some((position) => position === value);
}

const TRACK: Record<BarPosition, string> = {
  left: 'inset-y-0 left-[env(safe-area-inset-left)] flex w-1 flex-col-reverse',
  top: 'inset-x-0 top-[env(safe-area-inset-top)] h-1',
};

const FILL: Record<BarPosition, string> = {
  left: 'w-full transition-[height]',
  top: 'h-full transition-[width]',
};

/**
 * A thin line along one edge, like an article's reading progress: filled as far as the valence
 * goes, empty at −1 and full at +1. No labels. Empty with no valence.
 */
export function ValenceBar({ valence, position = 'top' }: { valence: number | null; position?: BarPosition }) {
  const share = `${(valence === null ? 0 : (valence + 1) / 2) * 100}%`;
  // Fades only into no valence, as the screen does, so it otherwise keeps up with the reading.
  const fade = valence === null ? 'duration-300' : 'duration-0';

  return (
    <div aria-hidden className={`pointer-events-none absolute bg-white/20 mix-blend-difference ${TRACK[position]}`}>
      <div
        className={`bg-white/70 ${FILL[position]} ${fade}`}
        style={position === 'top' ? { width: share } : { height: share }}
      />
    </div>
  );
}
