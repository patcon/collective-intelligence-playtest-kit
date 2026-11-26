import type { RoomSnapshot } from '../room/protocol.ts';

/** The room's counts, as the emcee reads them. */
export interface RoomProgress {
  /** Past the start screen and waiting for a round. */
  ready: number;
  /** Connected, but still on the start screen. */
  starting: number;
  /** Everyone the next match (a start or a reshuffle) would take: past the start screen, in a group or not. */
  nextRound: number;
  /** Ready after this round's groups were made. */
  late: number;
  groups: number;
  /** Groups where anyone has tapped "found them". */
  groupsFound: number;
  /** Everyone in a group this round, still connected. */
  people: number;
  peopleFound: number;
}

function countStatus(snapshot: RoomSnapshot, status: RoomSnapshot['participants'][number]['status']): number {
  return snapshot.participants.filter((p) => p.status === status).length;
}

/** Counts from a snapshot. A group counts as found once any member taps; people are counted one by one. */
export function progressOf(snapshot: RoomSnapshot): RoomProgress {
  return {
    groups: snapshot.groups.length,
    groupsFound: snapshot.groups.filter((g) => g.found > 0).length,
    late: countStatus(snapshot, 'late'),
    nextRound: snapshot.participants.filter((p) => p.status !== 'joined').length,
    people: snapshot.groups.reduce((sum, g) => sum + g.size, 0),
    peopleFound: snapshot.groups.reduce((sum, g) => sum + g.found, 0),
    ready: countStatus(snapshot, 'waiting'),
    starting: countStatus(snapshot, 'joined'),
  };
}
