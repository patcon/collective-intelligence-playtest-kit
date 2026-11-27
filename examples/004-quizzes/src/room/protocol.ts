// From `/server`, which has nothing that needs a browser, since the Worker reads messages with this too.
import { parseJsonObject } from '@playtest-kit/common/server';
import { isItemId } from '../items/items.ts';
import type { ItemId } from '../items/items.ts';
import { isQuizConfig } from './quizConfig.ts';
import type { QuizConfig } from './quizConfig.ts';
import { isAnswer, isParticipantView, isRoomSnapshot } from './roomViews.ts';
import type { Answer, ParticipantView, RoomSnapshot } from './roomViews.ts';

export type { QuizConfig } from './quizConfig.ts';
export type { Answer, Answers, ParticipantStatus, ParticipantView, Phase, RoomSnapshot } from './roomViews.ts';

/** The room's Agent class, as the Worker exports it and clients name it. */
export const AGENT = 'QuizRoom';

/** The one room every page joins. */
export const ROOM = 'demo';

/** Who a connection is: someone taking the quiz (a phone, or a simulated one), or the demo page running it. */
export type Role = 'participant' | 'host';

/**
 * A participant → the room: past the start screen; my answer to a statement (null to skip), which must be the
 * one I'm on; or back one statement, clearing that answer.
 */
export type ParticipantMessage = { type: 'ready' } | { type: 'answer'; item: ItemId; answer: Answer } | { type: 'undo' };

/** The host → the room. */
export type HostMessage = { type: 'config'; config: QuizConfig } | { type: 'start' | 'reset' };

/** The room → one participant, on joining and after every change to them. */
export interface ToParticipant {
  type: 'view';
  view: ParticipantView;
}

/** The room → the host, on joining and after changes (at most every 250 ms, but phase changes at once). */
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
  item?: unknown;
  answer?: unknown;
  config?: unknown;
  view?: unknown;
  snapshot?: unknown;
}

/** A participant's message from raw socket text, or null if it isn't one. */
export function parseParticipantMessage(raw: string): ParticipantMessage | null {
  const { type, item, answer }: RawMessage = parseJsonObject(raw) ?? {};
  if (type === 'ready' || type === 'undo') {
    return { type };
  }
  return type === 'answer' && typeof item === 'string' && isItemId(item) && isAnswer(answer) ? { answer, item, type } : null;
}

/** The host's message from raw socket text, or null if it isn't one. */
export function parseHostMessage(raw: string): HostMessage | null {
  const { type, config }: RawMessage = parseJsonObject(raw) ?? {};
  if (type === 'start' || type === 'reset') {
    return { type };
  }
  return type === 'config' && isQuizConfig(config) ? { config, type } : null;
}

/** The room's message to a participant, from raw socket text, or null if it isn't one. */
export function parseToParticipant(raw: string): ToParticipant | null {
  const { type, view }: RawMessage = parseJsonObject(raw) ?? {};
  return type === 'view' && isParticipantView(view) ? { type, view } : null;
}

/** The room's message to the host, from raw socket text, or null if it isn't one. */
export function parseToHost(raw: string): ToHost | null {
  const { type, snapshot }: RawMessage = parseJsonObject(raw) ?? {};
  return type === 'snapshot' && isRoomSnapshot(snapshot) ? { snapshot, type } : null;
}
