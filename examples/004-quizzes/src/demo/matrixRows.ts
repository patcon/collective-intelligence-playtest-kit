import { isSimId } from '@playtest-kit/common/simulation';
import type { Answers, RoomSnapshot } from '../room/protocol.ts';

export interface MatrixRow {
  id: string;
  name: string;
  kind: 'phone' | 'sim';
  connected: boolean;
  answers: Answers;
}

/**
 * One row per participant: real phones first ("Phone 1"…, in join order), then this page's sims in the page's
 * order (their names', not the order their sockets happened to connect in), then sims from other tabs, as
 * "Other sim", in join order. `simNames` is this page's sims, in its order.
 */
export function matrixRows(snapshot: RoomSnapshot, simNames: ReadonlyMap<string, string>): Array<MatrixRow> {
  const phones = snapshot.participants.filter((p) => !isSimId(p.id));
  const pageOrder = new Map([...simNames.keys()].map((id, i) => [id, i]));
  const placeOf = (id: string) => pageOrder.get(id) ?? Number.POSITIVE_INFINITY;
  const sims = snapshot.participants.filter((p) => isSimId(p.id)).toSorted((a, b) => placeOf(a.id) - placeOf(b.id));
  return [
    ...phones.map((p, i) => ({ answers: p.answers, connected: p.connected, id: p.id, kind: 'phone' as const, name: `Phone ${i + 1}` })),
    ...sims.map((p) => ({ answers: p.answers, connected: p.connected, id: p.id, kind: 'sim' as const, name: simNames.get(p.id) ?? 'Other sim' })),
  ];
}
