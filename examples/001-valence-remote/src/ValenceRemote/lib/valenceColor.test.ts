import { describe, expect, it } from 'vitest';
import { formatValence, valenceColor } from './valenceColor.ts';

describe('valenceColor', () => {
  it('runs red, black, green, and grey when it can’t tell', () => {
    expect(valenceColor(-1)).toBe('rgb(220 38 38)');
    expect(valenceColor(0)).toBe('rgb(0 0 0)');
    expect(valenceColor(1)).toBe('rgb(22 163 74)');
    expect(valenceColor(null)).toBe('rgb(115 115 115)');
  });

  it('is the idle badge\u2019s yellow when idle, whatever the valence', () => {
    const idle = valenceColor(1, true);
    expect(idle).toMatch(/^var\(--color-kumo-badge-orange, /);
    expect(valenceColor(-1, true)).toBe(idle);
    expect(valenceColor(null, true)).toBe(idle);
  });
});

describe('formatValence', () => {
  it('signs it to two decimals, or shows a dot', () => {
    expect(formatValence(0.5)).toBe('+0.50');
    expect(formatValence(-0.25)).toBe('−0.25');
    expect(formatValence(null)).toBe('·');
  });
});
