import { describe, expect, it } from 'vitest';
import { randomDelay } from './randomDelay.ts';

describe('randomDelay', () => {
  it('stays within the range, from its lowest to its highest draw', () => {
    expect(randomDelay(3000, 9000, () => 0)).toBe(3000);
    expect(randomDelay(3000, 9000, () => 0.5)).toBe(6000);
    expect(randomDelay(3000, 9000, () => 0.999)).toBeLessThan(9000);
  });
});
