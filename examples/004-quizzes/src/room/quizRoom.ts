import { ITEMS } from '../items/items.ts';
import type { ItemId } from '../items/items.ts';
import { chooseStatements } from './chooseStatements.ts';
import { DEFAULT_CONFIG } from './quizConfig.ts';
import type { QuizConfig } from './quizConfig.ts';
import type { Rng } from './rng.ts';
import type { Answer, Answers, Phase } from './roomViews.ts';

export interface Participant {
  /** The connection id, which `/participate` keeps per tab, so a reload comes back as the same person. */
  id: string;
  connected: boolean;
  /** Past the start screen. */
  ready: boolean;
  /** Taking this quiz: started with it, or joined it as a latecomer. */
  inQuiz: boolean;
  /** Index into `RoomState.statements` of the statement they're on; its length once done. */
  position: number;
  answers: Answers;
}

/** The whole room. Plain data, so the Agent can keep it with `setState` and it outlasts hibernation. */
export interface RoomState {
  phase: Phase;
  config: QuizConfig;
  /** The chosen statements, fixed from Start to Reset; empty in the lobby. */
  statements: ReadonlyArray<ItemId>;
  participants: ReadonlyArray<Participant>;
}

export type RoomEvent =
  | { type: 'join' | 'leave' | 'ready' | 'undo'; id: string }
  | { type: 'answer'; id: string; item: ItemId; answer: Answer }
  | { type: 'config'; config: QuizConfig }
  | { type: 'start' | 'reset' };

export const INITIAL_ROOM_STATE: RoomState = { config: DEFAULT_CONFIG, participants: [], phase: 'lobby', statements: [] };

const NOT_IN_QUIZ = { answers: {}, inQuiz: false, position: 0 } as const;

function withParticipant(state: RoomState, id: string, change: (p: Participant) => Participant | null): RoomState {
  const p = state.participants.find((candidate) => candidate.id === id);
  const changed = p ? change(p) : null;
  return p && changed ? { ...state, participants: state.participants.map((q) => (q === p ? changed : q)) } : state;
}

/** A known id coming back keeps its place and answers; a new one starts on the start screen. */
function join(state: RoomState, id: string): RoomState {
  if (state.participants.some((p) => p.id === id)) {
    return withParticipant(state, id, (p) => ({ ...p, connected: true }));
  }
  const joined: Participant = { connected: true, id, ready: false, ...NOT_IN_QUIZ };
  return { ...state, participants: [...state.participants, joined] };
}

/** During the quiz, someone who leaves is kept with their answers, in case they come back; in the lobby, they're forgotten. */
function leave(state: RoomState, id: string): RoomState {
  if (state.phase === 'quiz') {
    return withParticipant(state, id, (p) => ({ ...p, connected: false }));
  }
  return { ...state, participants: state.participants.filter((p) => p.id !== id) };
}

/** Past the start screen. Mid-quiz, with latecomers set to join, that means straight to the first statement. */
function ready(state: RoomState, id: string): RoomState {
  const joinsNow = state.phase === 'quiz' && state.config.latecomers === 'join';
  return withParticipant(state, id, (p) => {
    if (p.inQuiz || (p.ready && !joinsNow)) {
      return null;
    }
    return joinsNow ? { ...p, ...NOT_IN_QUIZ, inQuiz: true, ready: true } : { ...p, ready: true };
  });
}

/** Records an answer to the statement `id` is on, and moves them to the next. Any other statement is ignored. */
function answer(state: RoomState, id: string, item: ItemId, value: Answer): RoomState {
  return withParticipant(state, id, (p) =>
    state.phase === 'quiz' && p.inQuiz && state.statements[p.position] === item
      ? { ...p, answers: { ...p.answers, [item]: value }, position: p.position + 1 }
      : null,
  );
}

/** Back one statement, clearing the answer to it. From done, that's the last statement; at the first, nothing. */
function undo(state: RoomState, id: string): RoomState {
  return withParticipant(state, id, (p) => {
    const previous = state.statements[p.position - 1];
    if (state.phase !== 'quiz' || !p.inQuiz || previous === undefined) {
      return null;
    }
    const { [previous]: _cleared, ...answers } = p.answers;
    return { ...p, answers, position: p.position - 1 };
  });
}

function isStarting(p: Participant): boolean {
  return p.connected && p.ready;
}

/** Chooses the statements and starts everyone connected and ready on the first. Lobby only, and only once someone's ready. */
function start(state: RoomState, rng: Rng): RoomState {
  if (state.phase !== 'lobby' || !state.participants.some(isStarting)) {
    return state;
  }
  return {
    ...state,
    participants: state.participants.map((p) => (isStarting(p) ? { ...p, ...NOT_IN_QUIZ, inQuiz: true } : p)),
    phase: 'quiz',
    statements: chooseStatements(ITEMS, state.config.statementCount, rng),
  };
}

/** Back to the lobby: every answer and the statements cleared, everyone still here waiting, anyone gone forgotten. */
function reset(state: RoomState): RoomState {
  return {
    ...state,
    participants: state.participants.filter((p) => p.connected).map((p) => ({ ...p, ...NOT_IN_QUIZ })),
    phase: 'lobby',
    statements: [],
  };
}

/**
 * The room's next state after `event`. Pure: the same state, event and rng always give the same result,
 * and an event that doesn't apply returns `state` itself.
 */
export function reduce(state: RoomState, event: RoomEvent, rng: Rng): RoomState {
  switch (event.type) {
    case 'join':
      return join(state, event.id);
    case 'leave':
      return leave(state, event.id);
    case 'ready':
      return ready(state, event.id);
    case 'answer':
      return answer(state, event.id, event.item, event.answer);
    case 'undo':
      return undo(state, event.id);
    case 'config':
      return { ...state, config: event.config };
    case 'start':
      return start(state, rng);
    case 'reset':
      return reset(state);
  }
}
