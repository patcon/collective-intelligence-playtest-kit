import { shuffle } from '../../matching/rng.ts';
import type { Rng } from '../../matching/rng.ts';

/** A group's colour, named, so people who can't tell two colours apart can still read it. */
export interface ColourCue {
  type: 'colour';
  name: string;
  hex: string;
}

/** Colours far enough apart to tell across a room (from Sasha Trubetskoy's list of 20 distinct colours). */
export const PALETTE: ReadonlyArray<ColourCue> = [
  { hex: '#e6194b', name: 'Red', type: 'colour' },
  { hex: '#3cb44b', name: 'Green', type: 'colour' },
  { hex: '#ffe119', name: 'Yellow', type: 'colour' },
  { hex: '#4363d8', name: 'Blue', type: 'colour' },
  { hex: '#f58231', name: 'Orange', type: 'colour' },
  { hex: '#911eb4', name: 'Purple', type: 'colour' },
  { hex: '#42d4f4', name: 'Cyan', type: 'colour' },
  { hex: '#f032e6', name: 'Magenta', type: 'colour' },
  { hex: '#bfef45', name: 'Lime', type: 'colour' },
  { hex: '#fabed4', name: 'Pink', type: 'colour' },
  { hex: '#9a6324', name: 'Brown', type: 'colour' },
  { hex: '#000075', name: 'Navy', type: 'colour' },
];

/** One colour per group, all different while there are enough; past that, the palette repeats in a new order. */
export function assignColours(groupCount: number, rng: Rng): Array<ColourCue> {
  const out: Array<ColourCue> = [];
  while (out.length < groupCount) {
    out.push(...shuffle(PALETTE, rng).slice(0, groupCount - out.length));
  }
  return out;
}

const HEX = /^#[0-9a-f]{6}$/i;

export function isColourCue(value: unknown): value is ColourCue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'colour' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'hex' in value &&
    typeof value.hex === 'string' &&
    HEX.test(value.hex)
  );
}
