import type { Participant, RoomState } from './matchRoom.ts';
import { isGroupedStatus } from './roomViews.ts';
import type { GroupProgress, ParticipantStatus, ParticipantView, RoomSnapshot } from './roomViews.ts';

function statusOf(state: RoomState, p: Participant): ParticipantStatus {
  if (!p.ready) {
    return 'joined';
  }
  if (state.phase === 'lobby') {
    return 'waiting';
  }
  if (p.group === null) {
    return 'late';
  }
  if (state.phase === 'activity') {
    return 'activity';
  }
  return p.found ? 'found' : 'matched';
}

/** A group's progress, counting only those still connected. */
function progressOf(state: RoomState, group: number): GroupProgress {
  const members = state.participants.filter((p) => p.connected && p.group === group);
  return { found: members.filter((p) => p.found).length, size: members.length };
}

/** What participant `id`'s screen shows. Someone the room doesn't know is treated as just joined. */
export function viewFor(state: RoomState, id: string): ParticipantView {
  const p = state.participants.find((candidate) => candidate.id === id);
  if (!p) {
    return { status: 'joined' };
  }
  const status = statusOf(state, p);
  const cue = p.group === null ? undefined : state.groups[p.group];
  if (isGroupedStatus(status)) {
    return p.group !== null && cue ? { cue, group: progressOf(state, p.group), status } : { status: 'late' };
  }
  return { status };
}

/** The whole room as the host sees it, leaving out anyone not connected. */
export function snapshotOf(state: RoomState): RoomSnapshot {
  return {
    config: state.config,
    groups: state.groups.map((cue, g) => ({ cue, ...progressOf(state, g) })),
    participants: state.participants
      .filter((p) => p.connected)
      .map((p) => ({ group: p.group, id: p.id, status: statusOf(state, p) })),
    phase: state.phase,
    round: state.round,
  };
}
