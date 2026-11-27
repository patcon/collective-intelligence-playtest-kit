import { isItemId } from '../items/items.ts';
import type { ItemId } from '../items/items.ts';
import { isQuizConfig } from './quizConfig.ts';
import type { QuizConfig } from './quizConfig.ts';

/** `lobby` while people get ready, `quiz` once the statements are chosen and people answer them. */
export type Phase = 'lobby' | 'quiz';

/** 1 (Disagree) to 5 (Agree), or null for a skipped statement. */
export type Answer = 1 | 2 | 3 | 4 | 5 | null;

/** Someone's answers so far, by statement. A statement with no entry hasn't been answered yet. */
export type Answers = Readonly<Partial<Record<ItemId, Answer>>>;

/**
 * Where a participant is: `joined` (connected, still on the start screen), `waiting` (ready, in the lobby),
 * `answering` (in the quiz), `done` (answered or skipped every statement) or `late` (ready, but joined mid-quiz
 * while latecomers wait for the next one).
 */
export type ParticipantStatus = 'joined' | 'waiting' | 'answering' | 'done' | 'late';

/** What one participant's screen shows. */
export interface ParticipantView {
  status: ParticipantStatus;
  /** The statements they're answering, in order; empty unless they're in the quiz. */
  statements: ReadonlyArray<ItemId>;
  /** Index into `statements` of the one they're on; `statements.length` once done. */
  position: number;
  answers: Answers;
}

export interface ParticipantSummary {
  id: string;
  status: ParticipantStatus;
  connected: boolean;
  answers: Answers;
}

/** Everything the host sees: the whole room, as it is now. */
export interface RoomSnapshot {
  phase: Phase;
  config: QuizConfig;
  /** The chosen statements, in order; empty in the lobby. */
  statements: ReadonlyArray<ItemId>;
  participants: ReadonlyArray<ParticipantSummary>;
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

export function isAnswer(value: unknown): value is Answer {
  return value === null || (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5);
}

function isAnswers(value: unknown): value is Answers {
  return isObject(value) && Object.entries(value).every(([item, answer]) => isItemId(item) && isAnswer(answer));
}

function isItemIdList(value: unknown): value is ReadonlyArray<ItemId> {
  return Array.isArray(value) && value.every((item: unknown) => typeof item === 'string' && isItemId(item));
}

const STATUSES: ReadonlySet<unknown> = new Set<ParticipantStatus>(['joined', 'waiting', 'answering', 'done', 'late']);

function isStatus(value: unknown): value is ParticipantStatus {
  return STATUSES.has(value);
}

function isPosition(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

export function isParticipantView(value: unknown): value is ParticipantView {
  return (
    isObject(value) &&
    'status' in value &&
    isStatus(value.status) &&
    'statements' in value &&
    isItemIdList(value.statements) &&
    'position' in value &&
    isPosition(value.position) &&
    'answers' in value &&
    isAnswers(value.answers)
  );
}

function isParticipantSummary(value: unknown): value is ParticipantSummary {
  return (
    isObject(value) &&
    'id' in value &&
    typeof value.id === 'string' &&
    'status' in value &&
    isStatus(value.status) &&
    'connected' in value &&
    typeof value.connected === 'boolean' &&
    'answers' in value &&
    isAnswers(value.answers)
  );
}

export function isRoomSnapshot(value: unknown): value is RoomSnapshot {
  return (
    isObject(value) &&
    'phase' in value &&
    (value.phase === 'lobby' || value.phase === 'quiz') &&
    'config' in value &&
    isQuizConfig(value.config) &&
    'statements' in value &&
    isItemIdList(value.statements) &&
    'participants' in value &&
    Array.isArray(value.participants) &&
    value.participants.every((p: unknown) => isParticipantSummary(p))
  );
}
