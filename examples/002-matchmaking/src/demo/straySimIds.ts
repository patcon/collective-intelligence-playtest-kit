import type { RoomSnapshot } from '../room/protocol.ts';
import { isSimId } from '../simulation/SimulatedCrowd.ts';

/**
 * Simulated participants in the room that this page didn't make: from another tab, or from a page
 * that lost track of them. Real phones and this page's own sims are never included.
 */
export function straySimIds(snapshot: RoomSnapshot, ownSimIds: ReadonlySet<string>): Array<string> {
  return snapshot.participants.flatMap(({ id }) => (isSimId(id) && !ownSimIds.has(id) ? [id] : []));
}
