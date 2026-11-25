import { describe, expect, it } from 'vitest';
import { parsePhoneMessage, parseRoomMessage, parseViewerMessage } from './protocol.ts';

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

describe('settings messages', () => {
  const pushed = '{"type":"settings","settings":{"detection":"touch","tintWhenIdle":true}}';
  const cleared = '{"type":"settings","settings":null}';

  it('reads pushed and cleared settings, from a viewer or from the room', () => {
    const settings = { detection: 'touch', tintWhenIdle: true };
    expect(parseViewerMessage(pushed)).toEqual({ settings, type: 'settings' });
    expect(parseRoomMessage(pushed)).toEqual({ settings, type: 'settings' });
    expect(parseViewerMessage(cleared)).toEqual({ settings: null, type: 'settings' });
    expect(parseRoomMessage(cleared)).toEqual({ settings: null, type: 'settings' });
  });

  it('rejects unknown or missing settings', () => {
    expect(parseViewerMessage('{"type":"settings","settings":{"detection":"shake","tintWhenIdle":true}}')).toBeNull();
    expect(parseViewerMessage('{"type":"settings","settings":{"detection":"flip"}}')).toBeNull();
    expect(parseViewerMessage('{"type":"settings"}')).toBeNull();
  });

  it("doesn't take a phone's message as a viewer's", () => {
    expect(parseViewerMessage('{"type":"valence","v":0.5}')).toBeNull();
  });
});
