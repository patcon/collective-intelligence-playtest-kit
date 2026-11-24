import { describe, expect, it } from 'vitest';
import { formatValence, valenceColor } from './valenceColor.ts';

describe('valenceColor', () => {
  it('runs red, black, green, and grey when it can’t tell', () => {
    expect(valenceColor(-1)).toBe('rgb(220 38 38)');
    expect(valenceColor(0)).toBe('rgb(0 0 0)');
    expect(valenceColor(1)).toBe('rgb(22 163 74)');
    expect(valenceColor(null)).toBe('rgb(115 115 115)');
  });

  it('tints the same colour halfway to the idle yellow when idle', () => {
    const tinted = valenceColor(-1, true);
    expect(tinted).toMatch(/^color-mix\(in srgb, var\(--color-kumo-badge-orange, .+\) 50%, rgb\(220 38 38\)\)$/);
  });
});

describe('formatValence', () => {
  it('signs it to two decimals, or shows a dot', () => {
    expect(formatValence(0.5)).toBe('+0.50');
    expect(formatValence(-0.25)).toBe('−0.25');
    expect(formatValence(null)).toBe('·');
  });
});
