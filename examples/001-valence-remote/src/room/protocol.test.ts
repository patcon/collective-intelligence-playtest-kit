import { describe, expect, it } from 'vitest';
import { parsePhoneMessage, parseRoomMessage } from './protocol.ts';

describe('parsePhoneMessage', () => {
  it('reads a valence and an activity', () => {
    expect(parsePhoneMessage('{"type":"valence","v":0.5}')).toEqual({ type: 'valence', v: 0.5 });
    expect(parsePhoneMessage('{"type":"activity","activity":"idle"}')).toEqual({ activity: 'idle', type: 'activity' });
  });

  it('rejects an unknown activity, an out-of-range valence, and junk', () => {
    expect(parsePhoneMessage('{"type":"activity","activity":"asleep"}')).toBeNull();
    expect(parsePhoneMessage('{"type":"valence","v":2}')).toBeNull();
    expect(parsePhoneMessage('not json')).toBeNull();
  });
});

describe('parseRoomMessage', () => {
  it("reads a phone's activity as passed on by the room", () => {
    expect(parseRoomMessage('{"type":"activity","id":"a","activity":"arrived"}')).toEqual({
      activity: 'arrived',
      id: 'a',
      type: 'activity',
    });
  });

  it('needs a time on a valence', () => {
    expect(parseRoomMessage('{"type":"valence","id":"a","v":0}')).toBeNull();
    expect(parseRoomMessage('{"type":"valence","id":"a","v":0,"t":5}')).toEqual({ id: 'a', t: 5, type: 'valence', v: 0 });
  });
});
