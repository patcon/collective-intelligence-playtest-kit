import { describe, expect, it } from 'vitest';
import { foundCount } from './foundCount.ts';

describe('foundCount', () => {
  it('counts you as found before you tap', () => {
    expect(foundCount({ found: 0, size: 3 }, false)).toBe('1 of 3 found');
    expect(foundCount({ found: 1, size: 3 }, false)).toBe('2 of 3 found');
  });

  it("doesn't count you twice once you've tapped", () => {
    expect(foundCount({ found: 1, size: 3 }, true)).toBe('1 of 3 found');
    expect(foundCount({ found: 3, size: 3 }, true)).toBe('3 of 3 found');
  });
});
