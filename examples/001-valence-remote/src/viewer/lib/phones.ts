import type { RoomMessage } from '../../room/protocol.ts';
import type { Activity } from '../../ValenceRemote/lib/activity.ts';

/** How far back messages count towards a phone's rate. */
export const RATE_WINDOW_MS = 1000;

/** One connected phone, as the viewer has heard it. `recent` holds when its valences arrived, on the viewer's own clock (ms). */
export interface PhoneRow {
  id: string;
  v: number | null;
  /** Null until the phone says. */
  activity: Activity | null;
  recent: Array<number>;
}

export type Phones = Record<string, PhoneRow>;

function withMessage(row: PhoneRow, v: number | null, now: number): PhoneRow {
  const recent = row.recent.filter((t) => t > now - RATE_WINDOW_MS);
  return { ...row, recent: [...recent, now], v };
}

function emptyRow(id: string): PhoneRow {
  return { activity: null, id, recent: [], v: null };
}

/** The phones after a room message arrives at `now`. */
export function applyMessage(phones: Phones, msg: RoomMessage, now: number) {
  if (msg.type === 'left') {
    const { [msg.id]: _gone, ...rest } = phones;
    return rest;
  }
  if (msg.type === 'joined') {
    return msg.role === 'phone' && !phones[msg.id] ? { ...phones, [msg.id]: emptyRow(msg.id) } : phones;
  }
  if (!('id' in msg)) {
    return phones;
  }
  const row = phones[msg.id] ?? emptyRow(msg.id);
  if (msg.type === 'activity') {
    // A phone back at the start screen has no valence, whatever it last sent.
    const v = msg.activity === 'arrived' ? null : row.v;
    return { ...phones, [msg.id]: { ...row, activity: msg.activity, v } };
  }
  return { ...phones, [msg.id]: withMessage(row, msg.v, now) };
}

/** Messages per second from a phone, over the last RATE_WINDOW_MS. */
export function rateOf(row: PhoneRow, now: number): number {
  return (row.recent.filter((t) => t > now - RATE_WINDOW_MS).length * 1000) / RATE_WINDOW_MS;
}

