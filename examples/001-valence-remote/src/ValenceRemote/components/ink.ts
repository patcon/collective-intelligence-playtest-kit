/** Classes for marks drawn over the remote's colour: lines, bars and their words. */
export interface Ink {
  /** On the outermost element, so the marks stand off any background. */
  shadow: string;
  /** A faint track or guide. */
  track: string;
  /** A filled bar. */
  fill: string;
  /** A fainter filled bar, as the raw reading beside or under the snapped one. */
  dimFill: string;
  /** A shade over the end of `fill`, where the raw reading falls short of the snapped one. */
  shortfall: string;
  /** A dashed or secondary line. */
  line: string;
  /** The line that matters most, as where a finger is. */
  strongLine: string;
  text: string;
  /** A picture drawn in `currentColor`, faint enough to sit behind the valence. */
  picture: string;
}

const LIGHT: Ink = {
  dimFill: 'bg-white/35',
  fill: 'bg-white/90',
  shortfall: 'bg-black/30',
  picture: 'text-white/45',
  line: 'border-white/70',
  shadow: 'drop-shadow-[0_1px_1px_rgb(0_0_0/0.3)]',
  strongLine: 'border-white/90',
  text: 'text-white/90',
  track: 'bg-white/25',
};

const DARK: Ink = {
  dimFill: 'bg-black/25',
  fill: 'bg-black/70',
  shortfall: 'bg-white/35',
  picture: 'text-black/40',
  line: 'border-black/50',
  shadow: '',
  strongLine: 'border-black/70',
  text: 'text-black/80',
  track: 'bg-black/20',
};

/** White over the valence's colours; dark over the idle yellow, which is too light for white. */
export function inkFor(idle: boolean): Ink {
  return idle ? DARK : LIGHT;
}
