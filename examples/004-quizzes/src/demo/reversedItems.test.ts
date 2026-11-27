import { describe, expect, it } from 'vitest';
import { shownAnswer } from './reversedItems.ts';

// AGR1 is reversed ("I feel little concern for others."); EXT1 isn't.
describe('shownAnswer', () => {
  it('flips a reversed statement’s answers', () => {
    expect(([1, 2, 3, 4, 5] as const).map((answer) => shownAnswer('AGR1', answer, 'flipped'))).toEqual([5, 4, 3, 2, 1]);
  });

  it('leaves a statement that isn’t reversed as answered', () => {
    expect(shownAnswer('EXT1', 1, 'flipped')).toBe(1);
  });

  it('leaves skips and no answer yet as they are', () => {
    expect([shownAnswer('AGR1', null, 'flipped'), shownAnswer('AGR1', undefined, 'flipped')]).toEqual([null, undefined]);
  });

  it('shows everything as answered when not flipping', () => {
    expect(shownAnswer('AGR1', 1, 'answered')).toBe(1);
  });
});
