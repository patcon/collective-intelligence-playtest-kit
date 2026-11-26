// From `/server`, which has nothing that needs a browser, since the Worker reads messages with this too.
import { parseJsonObject } from '@playtest-kit/common/server';
import { isCueTypeId } from '../cues/cueTypes.ts';
import type { CueTypeId } from '../cues/cueTypes.ts';
import { isMatchConfig } from './matchConfig.ts';
import type { MatchConfig } from './matchConfig.ts';
import { isParticipantView, isRoomSnapshot } from './roomViews.ts';
import type { ParticipantView, RoomSnapshot } from './roomViews.ts';

export type { MatchConfig } from './matchConfig.ts';
export type { ParticipantView, RoomSnapshot } from './roomViews.ts';

/** The room's Agent class, as the Worker exports it and clients name it. */
export const AGENT = 'MatchRoom';

/** Who a connection is: someone being matched (a phone, or a simulated one), or the demo page running the room. */
export type Role = 'participant' | 'host';

/** A participant → the room: past the start screen, so match me; or, I've found my group (or, unticked, not yet). */
export type ParticipantMessage = { type: 'ready' } | { type: 'found'; found: boolean };

/** The host → the room. */
export type HostMessage = { type: 'config'; config: MatchConfig } | { type: 'start' | 'moveOn' | 'back' | 'reset' };

/**
 * The room → one participant, on joining and after every change: what their screen shows, and the
 * cue type the next round will use, so a waiting screen can say to turn the sound up before it's needed.
 */
export interface ToParticipant {
  type: 'view';
  view: ParticipantView;
  nextCue: CueTypeId;
}

/** The room → the host, on joining and after every change. */
export interface ToHost {
  type: 'snapshot';
  snapshot: RoomSnapshot;
}

export function isRole(value: unknown): value is Role {
  return value === 'participant' || value === 'host';
}

/** The fields any message might carry, before they're checked. */
interface RawMessage {
  type?: unknown;
  found?: unknown;
  config?: unknown;
  view?: unknown;
  nextCue?: unknown;
  snapshot?: unknown;
}

/** A participant's message from raw socket text, or null if it isn't one. */
export function parseParticipantMessage(raw: string): ParticipantMessage | null {
  const { type, found }: RawMessage = parseJsonObject(raw) ?? {};
  if (type === 'ready') {
    return { type };
  }
  return type === 'found' && typeof found === 'boolean' ? { found, type } : null;
}

/** The host's message from raw socket text, or null if it isn't one. */
export function parseHostMessage(raw: string): HostMessage | null {
  const msg: RawMessage = parseJsonObject(raw) ?? {};
  if (msg.type === 'start' || msg.type === 'moveOn' || msg.type === 'back' || msg.type === 'reset') {
    return { type: msg.type };
  }
  return msg.type === 'config' && isMatchConfig(msg.config) ? { config: msg.config, type: 'config' } : null;
}

/** The room's message to a participant, from raw socket text, or null if it isn't one. */
export function parseToParticipant(raw: string): ToParticipant | null {
  const msg: RawMessage = parseJsonObject(raw) ?? {};
  return msg.type === 'view' && isParticipantView(msg.view) && isCueTypeId(msg.nextCue)
    ? { nextCue: msg.nextCue, type: 'view', view: msg.view }
    : null;
}

/** The room's message to the host, from raw socket text, or null if it isn't one. */
export function parseToHost(raw: string): ToHost | null {
  const msg: RawMessage = parseJsonObject(raw) ?? {};
  return msg.type === 'snapshot' && isRoomSnapshot(msg.snapshot) ? { snapshot: msg.snapshot, type: 'snapshot' } : null;
}
