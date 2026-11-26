import type { ColourCue } from './colourCue.ts';

/** A colour cue, small: a swatch and its name. */
export function ColourCueChip({ cue }: { cue: ColourCue }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span aria-hidden className="size-3.5 rounded-full border border-kumo-line" style={{ backgroundColor: cue.hex }} />
      {cue.name}
    </span>
  );
}
