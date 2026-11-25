import { isActivity } from '../ValenceRemote/lib/activity.ts';
import type { Activity } from '../ValenceRemote/lib/activity.ts';
import type { PhoneMessage, RoomMessage } from './protocol.ts';

/**
 * What the room remembers about one phone, on its connection: what it last said, so a viewer that
 * joins later hears it too. Null fields: the phone hasn't said yet.
 */
export interface PhoneState {
  activity: Activity | null;
  /** Its last valence, and when the room got it (ms epoch). */
  valence: { v: number | null; t: number } | null;
}

export const NO_PHONE_STATE: PhoneState = { activity: null, valence: null };

function isValence(value: unknown): value is PhoneState['valence'] {
  return (
    value === null ||
    (typeof value === 'object' &&
      'v' in value &&
      (value.v === null || typeof value.v === 'number') &&
      't' in value &&
      typeof value.t === 'number')
  );
}

/** A phone's state as read back from its connection, which may predate this shape: anything else is none. */
export function phoneStateOf(value: unknown): PhoneState {
  if (typeof value !== 'object' || value === null) {
    return NO_PHONE_STATE;
  }
  const activity = 'activity' in value && isActivity(value.activity) ? value.activity : null;
  const valence = 'valence' in value && isValence(value.valence) ? value.valence : null;
  return { activity, valence };
}

/** The phone's state after it sends `msg`, which the room got at `now`. */
export function withPhoneMessage(state: PhoneState, msg: PhoneMessage, now: number): PhoneState {
  return msg.type === 'activity' ? { ...state, activity: msg.activity } : { ...state, valence: { t: now, v: msg.v } };
}

/**
 * What a viewer joining now needs to hear about a phone already here: that it joined, then its last
 * valence and activity, as if passed on live. Activity comes last so `arrived` clears the valence,
 * as it does live.
 */
export function catchUpOn(id: string, { activity, valence }: PhoneState): Array<RoomMessage> {
  const messages: Array<RoomMessage> = [{ id, role: 'phone', type: 'joined' }];
  if (valence) {
    messages.push({ id, t: valence.t, type: 'valence', v: valence.v });
  }
  if (activity) {
    messages.push({ activity, id, type: 'activity' });
  }
  return messages;
}
