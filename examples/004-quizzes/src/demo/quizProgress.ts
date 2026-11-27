import type { ParticipantStatus, RoomSnapshot } from '../room/protocol.ts';

/** How many connected participants have each status. */
export function countByStatus(snapshot: RoomSnapshot): Record<ParticipantStatus, number> {
  const counts: Record<ParticipantStatus, number> = { answering: 0, done: 0, joined: 0, late: 0, waiting: 0 };
  for (const p of snapshot.participants) {
    if (p.connected) {
      counts[p.status]++;
    }
  }
  return counts;
}

/** Why Start would be refused now, or null if it wouldn't be. */
export function startBlocker(snapshot: RoomSnapshot): string | null {
  if (snapshot.phase !== 'lobby') {
    return 'The quiz has started. Reset to start another.';
  }
  return countByStatus(snapshot).waiting === 0 ? 'No one is ready yet.' : null;
}

/** One line on where the room is, such as "Lobby · 52 ready" or "Quiz of 30 · 40 answering · 12 done". */
export function progressLine(snapshot: RoomSnapshot): string {
  const counts = countByStatus(snapshot);
  if (snapshot.phase === 'lobby') {
    return `Lobby · ${counts.waiting} ready · ${counts.joined} on the start screen`;
  }
  return `Quiz of ${snapshot.statements.length} · ${counts.answering} answering · ${counts.done} done · ${counts.late} waiting for the next`;
}
