import type { Item, ItemId } from '../items/items.ts';
import type { Participant, StreamSnapshot } from './stream.ts';

/**
 * PROTOTYPE. The answers as numbers, participants by statements: what the orders and the clustering work from.
 * `null` is no number: not answered yet, or skipped.
 */
export interface Table {
  rowIds: ReadonlyArray<string>;
  colIds: ReadonlyArray<ItemId>;
  values: ReadonlyArray<ReadonlyArray<number | null>>;
}

/** What a cell shows: the answer as given, or its score towards the trait (reversed statements flipped). */
export type Shown = 'answer' | 'score';

export function valueOf(answer: number | null | undefined, item: Item, shown: Shown): number | null {
  if (answer === null || answer === undefined) {
    return null;
  }
  return shown === 'score' && item.keyed === -1 ? 6 - answer : answer;
}

export function tableOf(snapshot: StreamSnapshot, shown: Shown): Table {
  return {
    colIds: snapshot.statements.map((s) => s.id),
    rowIds: snapshot.participants.map((p) => p.id),
    values: snapshot.participants.map((p: Participant) => snapshot.statements.map((s) => valueOf(p.answers.get(s.id), s, shown))),
  };
}

/** Each column's mean, over the numbers it has; 3 (neutral) where it has none. */
function columnMeans(table: Table): Array<number> {
  return table.colIds.map((_, c) => mean(table.values.map((row) => row[c] ?? null)) ?? 3);
}

/** The table with every gap filled by its column's mean, for the methods that need a number in every cell. */
export function filled(table: Table): Array<Array<number>> {
  const means = columnMeans(table);
  return table.values.map((row) => row.map((v, c) => v ?? means[c] ?? 3));
}

export function mean(values: ReadonlyArray<number | null>): number | null {
  const present = values.filter((v): v is number => v !== null);
  return present.length === 0 ? null : present.reduce((a, b) => a + b, 0) / present.length;
}

export function variance(values: ReadonlyArray<number | null>): number | null {
  const present = values.filter((v): v is number => v !== null);
  const m = mean(present);
  return m === null || present.length < 2 ? null : present.reduce((a, v) => a + (v - m) ** 2, 0) / present.length;
}

/** Root-mean-square difference over the statements both answered; Infinity if they share fewer than `minShared`. */
export function distance(a: ReadonlyArray<number | null>, b: ReadonlyArray<number | null>, minShared = 3): number {
  let sum = 0;
  let shared = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    if (x !== null && x !== undefined && y !== null && y !== undefined) {
      sum += (x - y) ** 2;
      shared += 1;
    }
  }
  return shared < minShared ? Number.POSITIVE_INFINITY : Math.sqrt(sum / shared);
}
