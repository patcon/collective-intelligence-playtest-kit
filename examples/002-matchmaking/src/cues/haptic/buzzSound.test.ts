import { describe, expect, it } from 'vitest';
import { clickTimes } from './buzzSound.ts';

describe('clickTimes', () => {
  it('clicks every 16 ms through a full-strength buzz', () => {
    expect(clickTimes([{ duration: 50, intensity: 1 }]).map((c) => c.at)).toEqual([0, 0.016, 0.032, 0.048]);
  });

  it('clicks more slowly through a weaker buzz', () => {
    expect(clickTimes([{ duration: 300, intensity: 0 }]).map((c) => c.at)).toEqual([0, 0.2]);
  });

  it('waits out each delay, after the buzz before it ends', () => {
    const clicks = clickTimes([
      { duration: 10, intensity: 1 },
      { delay: 100, duration: 10, intensity: 1 },
    ]);
    expect(clicks.map((c) => c.at)).toEqual([0, 0.11]);
  });
});
