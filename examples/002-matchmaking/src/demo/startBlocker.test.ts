import { describe, expect, it } from 'vitest';
import { startBlocker } from './startBlocker.ts';

const threes = { by: 'groupSize', groupSize: 3 } as const;

describe('startBlocker', () => {
  it('blocks with no one, or only one person, ready', () => {
    expect(startBlocker(0, threes)).toMatch(/No one is ready/);
    expect(startBlocker(1, threes)).toMatch(/Only 1 person/);
  });

  it('blocks a count of groups that would leave someone on their own, and says how many would work', () => {
    expect(startBlocker(3, { by: 'groupCount', groupCount: 2 })).toBe("3 people can't make 2 groups without someone on their own. Choose 1 group.");
    expect(startBlocker(7, { by: 'groupCount', groupCount: 5 })).toMatch(/Choose 3 groups or fewer/);
  });

  it('allows any start where every group has at least two', () => {
    expect(startBlocker(2, threes)).toBeNull();
    expect(startBlocker(4, { by: 'groupCount', groupCount: 2 })).toBeNull();
    expect(startBlocker(5, { by: 'groupCount', groupCount: 2 })).toBeNull();
  });
});
