import type { RoomSnapshot } from '../room/protocol.ts';

/** The room's counts, as the emcee reads them. */
export interface RoomProgress {
  /** Past the start screen and waiting for a round. */
  ready: number;
  /** Everyone the next round would match: past the start screen, in a group or not. */
  nextRound: number;
  groups: number;
  /** Everyone in a group this round, still connected. */
  people: number;
  peopleFound: number;
}

function countStatus(snapshot: RoomSnapshot, status: RoomSnapshot['participants'][number]['status']): number {
  return snapshot.participants.filter((p) => p.status === status).length;
}

/** Counts from a snapshot. People found are counted one by one, as they tick "Found them". */
export function progressOf(snapshot: RoomSnapshot): RoomProgress {
  return {
    groups: snapshot.groups.length,
    nextRound: snapshot.participants.filter((p) => p.status !== 'joined').length,
    people: snapshot.groups.reduce((sum, g) => sum + g.size, 0),
    peopleFound: snapshot.groups.reduce((sum, g) => sum + g.found, 0),
    ready: countStatus(snapshot, 'waiting'),
  };
}
