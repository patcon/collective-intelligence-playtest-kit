import { isSimId } from './simIds.ts';

/**
 * Simulated participants in the room that this page didn't make: from another tab, or from a page
 * that lost track of them. Real phones and this page's own sims are never included.
 */
export function straySimIds(participantIds: ReadonlyArray<string>, ownSimIds: ReadonlySet<string>): Array<string> {
  return participantIds.filter((id) => isSimId(id) && !ownSimIds.has(id));
}
