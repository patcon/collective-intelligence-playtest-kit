import type { RoomMessage } from '../../room/protocol.ts';

/** How far back messages count towards a phone's rate. */
export const RATE_WINDOW_MS = 1000;

/** One connected phone, as the viewer has heard it. Times are the viewer's own clock (ms). */
export interface PhoneRow {
  id: string;
  v: number | null;
  lastAt: number | null;
  recent: Array<number>;
}

export type Phones = Record<string, PhoneRow>;

function withMessage(row: PhoneRow, v: number | null, now: number): PhoneRow {
  const recent = row.recent.filter((t) => t > now - RATE_WINDOW_MS);
  return { ...row, lastAt: now, recent: [...recent, now], v };
}

function emptyRow(id: string): PhoneRow {
  return { id, lastAt: null, recent: [], v: null };
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
  return { ...phones, [msg.id]: withMessage(row, msg.v, now) };
}

/** Messages per second from a phone, over the last RATE_WINDOW_MS. */
export function rateOf(row: PhoneRow, now: number): number {
  return (row.recent.filter((t) => t > now - RATE_WINDOW_MS).length * 1000) / RATE_WINDOW_MS;
}

/** How long since a phone last sent, as seconds with one decimal, or a dash if it never has. */
export function formatAge(row: PhoneRow, now: number): string {
  return row.lastAt === null ? '—' : `${((now - row.lastAt) / 1000).toFixed(1)} s`;
}
