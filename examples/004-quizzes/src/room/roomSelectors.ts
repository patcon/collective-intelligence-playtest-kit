import type { Participant, RoomState } from './quizRoom.ts';
import type { ParticipantStatus, ParticipantView, RoomSnapshot } from './roomViews.ts';

function statusOf(state: RoomState, p: Participant): ParticipantStatus {
  if (!p.ready) {
    return 'joined';
  }
  if (state.phase === 'lobby') {
    return 'waiting';
  }
  if (!p.inQuiz) {
    return 'late';
  }
  return p.position < state.statements.length ? 'answering' : 'done';
}

/** What participant `id`'s screen shows. Someone the room doesn't know is treated as just joined. */
export function viewFor(state: RoomState, id: string): ParticipantView {
  const p = state.participants.find((candidate) => candidate.id === id);
  if (!p) {
    return { answers: {}, position: 0, statements: [], status: 'joined' };
  }
  return { answers: p.answers, position: p.position, statements: p.inQuiz ? state.statements : [], status: statusOf(state, p) };
}

/** The whole room as the host sees it, including anyone gone mid-quiz (kept, with `connected` false). */
export function snapshotOf(state: RoomState): RoomSnapshot {
  return {
    config: state.config,
    participants: state.participants.map((p) => ({ answers: p.answers, connected: p.connected, id: p.id, status: statusOf(state, p) })),
    phase: state.phase,
    statements: state.statements,
  };
}
