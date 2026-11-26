import { parseJsonObject } from '@playtest-kit/common';
import { isActivity } from '../ValenceRemote/lib/activity.ts';
import type { Activity } from '../ValenceRemote/lib/activity.ts';
import { isRemoteSettings } from './remoteSettings.ts';
import type { RemoteSettings } from './remoteSettings.ts';

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

/** A phone → the room: what its holder is doing with it, sent when that changes. */
export interface PhoneActivity {
  type: 'activity';
  activity: Activity;
}

/** The room → viewers: one phone's activity, with the phone's connection id. */
export interface RoomActivity {
  type: 'activity';
  id: string;
  activity: Activity;
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

/** A viewer → the room: the settings every phone is to run with. */
export interface ViewerSettings {
  type: 'settings';
  settings: RemoteSettings;
}

/**
 * The room → everyone, and to each connection as it joins: the settings every phone runs with, or
 * null until a viewer sets them (each phone then uses its own, from its URL).
 */
export interface SettingsMessage {
  type: 'settings';
  settings: RemoteSettings | null;
}

export type PhoneMessage = PhoneValence | PhoneActivity;

export type ViewerMessage = ViewerSettings;

export type RoomMessage = PhoneMessage | RoomValence | RoomActivity | Joined | Left | SettingsMessage;

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
  activity?: unknown;
  v?: unknown;
  t?: unknown;
  settings?: unknown;
}

function phoneMessageOf(msg: RawMessage): PhoneMessage | null {
  if (msg.type === 'valence' && isValence(msg.v)) {
    return { type: 'valence', v: msg.v };
  }
  if (msg.type === 'activity' && isActivity(msg.activity)) {
    return { activity: msg.activity, type: 'activity' };
  }
  return null;
}

/** A phone's message from raw socket text, or null if it isn't one. */
export function parsePhoneMessage(raw: string): PhoneMessage | null {
  const msg: RawMessage | null = parseJsonObject(raw);
  return msg && phoneMessageOf(msg);
}

function settingsMessageOf(msg: RawMessage): SettingsMessage | null {
  const { settings } = msg;
  return msg.type === 'settings' && (settings === null || isRemoteSettings(settings))
    ? { settings, type: 'settings' }
    : null;
}

/** A viewer's message from raw socket text, or null if it isn't one. */
export function parseViewerMessage(raw: string): ViewerMessage | null {
  const msg: RawMessage | null = parseJsonObject(raw);
  return msg?.type === 'settings' && isRemoteSettings(msg.settings) ? { settings: msg.settings, type: 'settings' } : null;
}

/** A phone's message as the room passes it on: with the phone's id, and a valence's time. */
function passedOn(msg: RawMessage, id: string): RoomValence | RoomActivity | null {
  const phone = phoneMessageOf(msg);
  if (phone?.type === 'activity') {
    return { ...phone, id };
  }
  if (phone?.type === 'valence' && typeof msg.t === 'number') {
    return { ...phone, id, t: msg.t };
  }
  return null;
}

/** A message about one connection, as the room sends it, or null if it isn't one. */
function aboutConnection(msg: RawMessage, id: string): RoomMessage | null {
  if (msg.type === 'left') {
    return { id, type: 'left' };
  }
  if (msg.type === 'joined' && isRole(msg.role)) {
    return { id, role: msg.role, type: 'joined' };
  }
  return passedOn(msg, id);
}

/** A message from the room, from raw socket text, or null if it isn't one. */
export function parseRoomMessage(raw: string): RoomMessage | null {
  const msg: RawMessage | null = parseJsonObject(raw);
  if (!msg) {
    return null;
  }
  return settingsMessageOf(msg) ?? (typeof msg.id === 'string' ? aboutConnection(msg, msg.id) : null);
}
