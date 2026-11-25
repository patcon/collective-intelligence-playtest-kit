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
  const set =
    '{"type":"settings","settings":{"detection":"touch","tintWhenIdle":true,"showNumeric":false,"allowSelection":false}}';
  const unset = '{"type":"settings","settings":null}';

  it('reads settings from a viewer or from the room', () => {
    const settings = { allowSelection: false, detection: 'touch', showNumeric: false, tintWhenIdle: true };
    expect(parseViewerMessage(set)).toEqual({ settings, type: 'settings' });
    expect(parseRoomMessage(set)).toEqual({ settings, type: 'settings' });
  });

  it('reads no settings yet from the room, but not from a viewer', () => {
    expect(parseRoomMessage(unset)).toEqual({ settings: null, type: 'settings' });
    expect(parseViewerMessage(unset)).toBeNull();
  });

  it('rejects unknown or missing settings', () => {
    expect(
      parseViewerMessage(
        '{"type":"settings","settings":{"detection":"shake","tintWhenIdle":true,"showNumeric":false,"allowSelection":false}}',
      ),
    ).toBeNull();
    expect(parseViewerMessage('{"type":"settings","settings":{"detection":"flip","tintWhenIdle":true}}')).toBeNull();
    expect(
      parseViewerMessage('{"type":"settings","settings":{"detection":"flip","tintWhenIdle":true,"allowSelection":false}}'),
    ).toBeNull();
    expect(parseViewerMessage('{"type":"settings"}')).toBeNull();
  });

  it("doesn't take a phone's message as a viewer's", () => {
    expect(parseViewerMessage('{"type":"valence","v":0.5}')).toBeNull();
  });
});
