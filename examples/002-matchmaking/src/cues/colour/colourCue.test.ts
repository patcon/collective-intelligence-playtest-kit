import { describe, expect, it } from 'vitest';
import { seededRng } from '../../matching/rng.ts';
import { assignColours, isColourCue, PALETTE } from './colourCue.ts';

describe('assignColours', () => {
  it('gives every group a different colour, up to the size of the palette', () => {
    const colours = assignColours(PALETTE.length, seededRng(1));
    expect(colours).toHaveLength(PALETTE.length);
    expect(new Set(colours.map((c) => c.name)).size).toBe(PALETTE.length);
  });

  it('repeats colours only once the palette runs out', () => {
    const colours = assignColours(PALETTE.length + 3, seededRng(2));
    expect(colours).toHaveLength(PALETTE.length + 3);
    expect(new Set(colours.slice(0, PALETTE.length).map((c) => c.name)).size).toBe(PALETTE.length);
  });

  it('gives no colours to no groups', () => {
    expect(assignColours(0, seededRng(1))).toEqual([]);
  });
});

describe('isColourCue', () => {
  it('accepts a palette colour and rejects a malformed one', () => {
    expect(isColourCue({ ...PALETTE[0] })).toBe(true);
    expect(isColourCue({ hex: 'red', name: 'Red', type: 'colour' })).toBe(false);
    expect(isColourCue({ hex: '#ff0000', type: 'colour' })).toBe(false);
  });
});
