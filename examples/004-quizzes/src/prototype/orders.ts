import { ca_order, hcluster } from 'reorder.js';
import type { ClusterNode } from 'reorder.js';
import { TRAITS } from '../items/items.ts';
import type { Item, ItemId } from '../items/items.ts';
import { filled, mean, variance } from './table.ts';
import type { Table } from './table.ts';

/**
 * PROTOTYPE. Orders for each axis: each takes the table and the previous order and returns ids in display order.
 * Sorts break ties by the previous order, and the similarity orders (which may come out mirrored from one run to
 * the next) are flipped to whichever way is closer to it, so re-sorting live data moves things a little, not all.
 */

export const ROW_ORDERS = [
  { label: 'Joined', value: 'joined' },
  { label: 'Agreeing', value: 'agreement' },
  { label: 'Similar', value: 'similar' },
  { label: 'Clusters', value: 'clusters' },
  { label: 'CA', value: 'ca' },
] as const;
export type RowOrder = (typeof ROW_ORDERS)[number]['value'] | 'statement';

export const COLUMN_ORDERS = [
  { label: 'Seen', value: 'seen' },
  { label: 'Trait', value: 'trait' },
  { label: 'Agreed', value: 'agreement' },
  { label: 'Divisive', value: 'division' },
  { label: 'Similar', value: 'similar' },
  { label: 'CA', value: 'ca' },
] as const;
export type ColumnOrder = (typeof COLUMN_ORDERS)[number]['value'];

export function rowOrderOf(value: string): RowOrder | null {
  return value === 'statement' ? 'statement' : (ROW_ORDERS.find((o) => o.value === value)?.value ?? null);
}

export function columnOrderOf(value: string): ColumnOrder | null {
  return COLUMN_ORDERS.find((o) => o.value === value)?.value ?? null;
}

/** Rows sorted by their answer to one statement (clicking its header). */
export interface SortBy {
  id: ItemId;
  dir: 1 | -1;
}

/** Rows with fewer answers than this sit at the end, in the order they joined, out of the similarity orders. */
const MIN_ANSWERS = 3;

/** `ids` sorted by `key` (`dir` 1 is descending), no key last, ties kept in the previous order. */
function byKey<T extends string>(ids: ReadonlyArray<T>, prev: ReadonlyArray<T>, key: (id: T) => number | null, dir: 1 | -1 = 1): Array<T> {
  const prevPos = new Map(prev.map((id, i) => [id, i]));
  const base = new Map(ids.map((id, i) => [id, prevPos.get(id) ?? prev.length + i]));
  const keys = new Map(ids.map((id) => [id, key(id)]));
  return ids.toSorted((a, b) => {
    const ka = keys.get(a) ?? null;
    const kb = keys.get(b) ?? null;
    if (ka !== kb) {
      if (ka === null) {
        return 1;
      }
      if (kb === null) {
        return -1;
      }
      return (kb - ka) * dir;
    }
    return (base.get(a) ?? 0) - (base.get(b) ?? 0);
  });
}

/** `next`, or `next` reversed, whichever moves the ids less from where they were in `prev`. */
function alignTo<T>(prev: ReadonlyArray<T>, next: Array<T>): Array<T> {
  const prevPos = new Map(prev.map((id, i) => [id, i]));
  const cost = (order: ReadonlyArray<T>) =>
    order.reduce((sum, id, i) => {
      const p = prevPos.get(id);
      return p === undefined ? sum : sum + Math.abs(p - i);
    }, 0);
  const reversed = next.toReversed();
  return cost(reversed) < cost(next) ? reversed : next;
}

interface PositionSum {
  sum: number;
  count: number;
}

/**
 * Rows of `matrix` in similarity order: the leaves of an average-linkage clustering, with each merge's two halves
 * put in whichever order keeps them closer to `prevPos` (mean previous position, by row index), so the result
 * moves as little as it can from the last order, whatever that was.
 */
function similarityOrder(matrix: Array<Array<number>>, prevPos: (index: number) => number | undefined): Array<number> {
  const root = hcluster().linkage('average')(matrix);
  const meanPos = new Map<ClusterNode, number>();
  const measure = (node: ClusterNode | null): PositionSum => {
    if (!node) {
      return { count: 0, sum: 0 };
    }
    if (!node.left && !node.right) {
      const p = prevPos(node.id);
      return p === undefined ? { count: 0, sum: 0 } : { count: 1, sum: p };
    }
    const l = measure(node.left);
    const r = measure(node.right);
    const total: PositionSum = { count: l.count + r.count, sum: l.sum + r.sum };
    if (total.count > 0) {
      meanPos.set(node, total.sum / total.count);
    }
    return total;
  };
  measure(root);
  const leaves: Array<number> = [];
  const walk = (node: ClusterNode | null) => {
    if (!node) {
      return;
    }
    if (!node.left && !node.right) {
      leaves.push(node.id);
      return;
    }
    const l = node.left ? meanPos.get(node.left) : undefined;
    const r = node.right ? meanPos.get(node.right) : undefined;
    const swap = l !== undefined && r !== undefined && r < l;
    walk(swap ? node.right : node.left);
    walk(swap ? node.left : node.right);
  };
  walk(root);
  return leaves;
}

function safely<T>(run: () => T, fallback: T): T {
  try {
    return run();
  } catch {
    return fallback;
  }
}

/** The table's rows split into those with enough answers to place (`ready`) and the rest (`waiting`), as indices. */
function readiness(table: Table) {
  const ready: Array<number> = [];
  const waiting: Array<number> = [];
  table.values.forEach((row, i) => (row.filter((v) => v !== null).length >= MIN_ANSWERS ? ready : waiting).push(i));
  return { ready, waiting };
}

/** Similarity order of the ready rows (see `similarityOrder`), then the waiting ones. */
function similarRows(table: Table, prev: ReadonlyArray<string>): Array<string> {
  const { ready, waiting } = readiness(table);
  const ids = (indices: ReadonlyArray<number>) => indices.map((i) => table.rowIds[i] ?? '');
  if (ready.length < 3) {
    return [...ids(ready), ...ids(waiting)];
  }
  const all = filled(table);
  const matrix = ready.map((i) => all[i] ?? []);
  const prevPos = new Map(prev.map((id, i) => [id, i]));
  const perm = safely(() => similarityOrder(matrix, (p) => prevPos.get(table.rowIds[ready[p] ?? 0] ?? '')), ready.map((_, i) => i));
  return [...perm.map((p) => table.rowIds[ready[p] ?? 0] ?? ''), ...ids(waiting)];
}

function caRows(table: Table, prev: ReadonlyArray<string>): Array<string> {
  const { ready, waiting } = readiness(table);
  const ids = (indices: ReadonlyArray<number>) => indices.map((i) => table.rowIds[i] ?? '');
  if (ready.length < 3) {
    return [...ids(ready), ...ids(waiting)];
  }
  const all = filled(table);
  const perm = safely(() => ca_order(ready.map((i) => all[i] ?? [])).rows, ready.map((_, i) => i));
  return [...alignTo(prev, perm.map((p) => table.rowIds[ready[p] ?? 0] ?? '')), ...ids(waiting)];
}

export interface RowContext {
  /** Cluster label per participant; -1 or missing is none. */
  clusters: ReadonlyMap<string, number>;
  sortBy: SortBy | null;
}

/**
 * Clusters in label order (labels are kept steady from run to run, so each block stays where it is), each in
 * similarity order inside; no cluster last.
 */
function clusterRows(table: Table, prev: ReadonlyArray<string>, clusters: ReadonlyMap<string, number>): Array<string> {
  const similar = similarRows(table, prev);
  return byKey(similar, similar, (id) => -((clusters.get(id) ?? -1) >= 0 ? (clusters.get(id) ?? 0) : Number.POSITIVE_INFINITY));
}

export function orderRows(order: RowOrder, table: Table, prev: ReadonlyArray<string>, { clusters, sortBy }: RowContext): Array<string> {
  const rowIndex = new Map(table.rowIds.map((id, i) => [id, i]));
  const rowOf = (id: string) => table.values[rowIndex.get(id) ?? -1] ?? [];
  const column = sortBy ? table.colIds.indexOf(sortBy.id) : -1;
  const orders: Record<RowOrder, () => Array<string>> = {
    agreement: () => byKey(table.rowIds, prev, (id) => mean(rowOf(id))),
    ca: () => caRows(table, prev),
    clusters: () => clusterRows(table, prev, clusters),
    joined: () => [...table.rowIds],
    similar: () => similarRows(table, prev),
    statement: () => byKey(table.rowIds, prev, (id) => rowOf(id)[column] ?? null, sortBy?.dir ?? 1),
  };
  return orders[order]();
}

export function orderColumns(order: ColumnOrder, table: Table, statements: ReadonlyArray<Item>, prev: ReadonlyArray<ItemId>): Array<ItemId> {
  const seen = statements.map((s) => s.id);
  const column = (id: ItemId) => {
    const c = table.colIds.indexOf(id);
    return table.values.map((row) => row[c] ?? null);
  };
  switch (order) {
    case 'seen':
      return seen;
    case 'trait': {
      const trait = new Map(statements.map((s) => [s.id, TRAITS.indexOf(s.trait)]));
      return byKey(seen, seen, (id) => -(trait.get(id) ?? 0));
    }
    case 'agreement':
      return byKey(seen, prev, (id) => mean(column(id)));
    case 'division':
      return byKey(seen, prev, (id) => variance(column(id)));
    case 'similar': {
      const { ready } = readiness(table);
      if (ready.length < 3) {
        return seen;
      }
      const all = filled(table);
      const transposed = table.colIds.map((_, c) => ready.map((r) => all[r]?.[c] ?? 3));
      const prevPos = new Map(prev.map((id, i) => [id, i]));
      const perm = safely(() => similarityOrder(transposed, (p) => prevPos.get(table.colIds[p] ?? 'EXT1')), seen.map((_, i) => i));
      return perm.map((p) => table.colIds[p] ?? seen[0] ?? 'EXT1');
    }
    case 'ca': {
      const { ready } = readiness(table);
      if (ready.length < 3) {
        return seen;
      }
      const all = filled(table);
      const perm = safely(() => ca_order(ready.map((r) => all[r] ?? [])).cols, seen.map((_, i) => i));
      return alignTo(prev, perm.map((p) => table.colIds[p] ?? seen[0] ?? 'EXT1'));
    }
  }
}
