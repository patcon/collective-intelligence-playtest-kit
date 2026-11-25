/** Classes for marks drawn over the remote's colour: lines, bars and their words. */
export interface Ink {
  /** On the outermost element, so the marks stand off any background. */
  shadow: string;
  /** A faint track or guide. */
  track: string;
  /** A filled bar. */
  fill: string;
  /** A dashed or secondary line. */
  line: string;
  /** The line that matters most, as where a finger is. */
  strongLine: string;
  text: string;
}

const LIGHT: Ink = {
  fill: 'bg-white/70',
  line: 'border-white/70',
  shadow: 'drop-shadow-[0_1px_1px_rgb(0_0_0/0.3)]',
  strongLine: 'border-white/90',
  text: 'text-white/90',
  track: 'bg-white/25',
};

const DARK: Ink = {
  fill: 'bg-black/60',
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
