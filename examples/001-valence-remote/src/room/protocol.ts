/** Who a connection is: a phone sending valence, or a viewer watching the room. */
export type Role = 'phone' | 'viewer';

/** A phone → the room: its valence, −1 to +1, or null when it can't tell. */
export interface PhoneValence {
  type: 'valence';
  v: number | null;
}

/** The room → viewers: one phone's valence, with the phone's connection id and when the room got it (ms epoch). */
export interface RoomValence {
  type: 'valence';
  id: string;
  v: number | null;
  t: number;
}

/** The room → viewers: someone connected. */
export interface Joined {
  type: 'joined';
  id: string;
  role: Role;
}

/** The room → viewers: someone disconnected. */
export interface Left {
  type: 'left';
  id: string;
}

export type RoomMessage = PhoneValence | RoomValence | Joined | Left;

export function isRole(value: unknown): value is Role {
  return value === 'phone' || value === 'viewer';
}

function isValence(v: unknown): v is number | null {
  return v === null || (typeof v === 'number' && Number.isFinite(v) && v >= -1 && v <= 1);
}

/** The fields any message might carry, before they're checked. */
interface RawMessage {
  type?: unknown;
  id?: unknown;
  role?: unknown;
  v?: unknown;
  t?: unknown;
}

function readMessage(raw: string): RawMessage | null {
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === 'object' && value !== null ? value : null;
  } catch {
    return null;
  }
}

/** A phone's message from raw socket text, or null if it isn't one. */
export function parsePhoneValence(raw: string): PhoneValence | null {
  const msg = readMessage(raw);
  if (msg?.type !== 'valence' || !isValence(msg.v)) {
    return null;
  }
  return { type: 'valence', v: msg.v };
}

/** A message from the room to a viewer, from raw socket text, or null if it isn't one. */
export function parseRoomMessage(raw: string): RoomMessage | null {
  const msg = readMessage(raw);
  if (typeof msg?.id !== 'string') {
    return null;
  }
  const { id } = msg;
  if (msg.type === 'left') {
    return { id, type: 'left' };
  }
  if (msg.type === 'joined' && isRole(msg.role)) {
    return { id, role: msg.role, type: 'joined' };
  }
  if (msg.type === 'valence' && isValence(msg.v) && typeof msg.t === 'number') {
    return { id, t: msg.t, type: 'valence', v: msg.v };
  }
  return null;
}
