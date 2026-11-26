import { describe, expect, it } from 'vitest';
import { parseJsonObject } from './parseJsonObject.ts';

describe('parseJsonObject', () => {
  it('returns an object', () => {
    expect(parseJsonObject('{"type":"ready","n":1}')).toEqual({ n: 1, type: 'ready' });
  });

  it.each(['not json', '', '1', '"text"', 'null', '[1,2]', 'true'])('returns null for %j', (raw) => {
    expect(parseJsonObject(raw)).toBeNull();
  });
});
