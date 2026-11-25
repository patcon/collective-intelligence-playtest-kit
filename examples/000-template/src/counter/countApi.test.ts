import { describe, expect, it } from 'vitest';
import { parseCount } from './countApi.ts';

describe('parseCount', () => {
  it('reads a whole-number count', () => {
    expect(parseCount({ count: 3 })).toBe(3);
  });

  it.each([null, 'x', {}, { count: '3' }, { count: 1.5 }, { count: -1 }])('rejects %j', (body) => {
    expect(() => parseCount(body)).toThrow();
  });
});
