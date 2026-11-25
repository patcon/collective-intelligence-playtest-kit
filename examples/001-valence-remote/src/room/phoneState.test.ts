import { describe, expect, it } from 'vitest';
import { catchUpOn, NO_PHONE_STATE, phoneStateOf, withPhoneMessage } from './phoneState.ts';

describe('phone state', () => {
  it('remembers the last activity and valence, with when the valence came', () => {
    let state = withPhoneMessage(NO_PHONE_STATE, { activity: 'idle', type: 'activity' }, 1);
    state = withPhoneMessage(state, { type: 'valence', v: 0.5 }, 2);
    state = withPhoneMessage(state, { type: 'valence', v: null }, 3);
    expect(state).toEqual({ activity: 'idle', valence: { t: 3, v: null } });
  });

  it('reads back what it stored, and anything else as nothing said', () => {
    const stored = { activity: 'active', valence: { t: 5, v: -0.2 } };
    expect(phoneStateOf(stored)).toEqual(stored);
    expect(phoneStateOf(null)).toEqual(NO_PHONE_STATE);
    expect(phoneStateOf({ activity: 'asleep', valence: { v: 'x' } })).toEqual(NO_PHONE_STATE);
  });
});

describe('catchUpOn', () => {
  it('says only that a phone joined when it has said nothing', () => {
    expect(catchUpOn('p1', NO_PHONE_STATE)).toEqual([{ id: 'p1', role: 'phone', type: 'joined' }]);
  });

  it('replays the valence before the activity, so arrived can clear it', () => {
    expect(catchUpOn('p1', { activity: 'arrived', valence: { t: 9, v: 0.3 } })).toEqual([
      { id: 'p1', role: 'phone', type: 'joined' },
      { id: 'p1', t: 9, type: 'valence', v: 0.3 },
      { activity: 'arrived', id: 'p1', type: 'activity' },
    ]);
  });
});
