import type { ReactNode } from 'react';
import type { ColourCue } from './colourCue.ts';

/** How bright a `#rrggbb` colour looks, 0 (black) to 255 (white), weighting green most as eyes do. */
function brightness(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  return (299 * r + 587 * g + 114 * b) / 1000;
}

/** The screen filled with the group's colour, its name large, and `children` below it. */
export function ColourCueView({ cue, children }: { cue: ColourCue; children?: ReactNode }) {
  const ink = brightness(cue.hex) > 150 ? 'text-black' : 'text-white';
  return (
    <main className={`fixed inset-0 flex flex-col items-center justify-center gap-8 p-8 text-center ${ink}`} style={{ backgroundColor: cue.hex }}>
      <p className="text-6xl font-bold">{cue.name}</p>
      {children}
    </main>
  );
}
