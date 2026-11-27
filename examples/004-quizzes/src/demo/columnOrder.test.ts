import { describe, expect, it } from 'vitest';
import { orderColumns } from './columnOrder.ts';

const SEEN = ['OPN2', 'EXT5', 'AGR1', 'EXT1', 'OPN1', 'AGR7'] as const;

describe('orderColumns', () => {
  it('keeps the order seen', () => {
    expect(orderColumns(SEEN, 'seen').map(({ item }) => item)).toEqual(SEEN);
  });

  it('groups by trait in the test’s trait order, each group still in the order seen', () => {
    expect(orderColumns(SEEN, 'trait').map(({ item }) => item)).toEqual(['EXT5', 'EXT1', 'AGR1', 'AGR7', 'OPN2', 'OPN1']);
  });

  it('remembers each column’s place in the order seen', () => {
    expect(orderColumns(SEEN, 'trait').map(({ seen }) => seen)).toEqual([1, 3, 2, 5, 0, 4]);
  });
});
