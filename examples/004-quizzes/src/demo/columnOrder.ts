import { itemById, TRAITS } from '../items/items.ts';
import type { ItemId } from '../items/items.ts';

/** How the vote matrix orders its columns: as the statements were seen, or grouped by trait. */
export type ColumnOrder = 'seen' | 'trait';

export const COLUMN_ORDERS: ReadonlyArray<{ label: string; value: ColumnOrder }> = [
  { label: 'Order seen', value: 'seen' },
  { label: 'By trait', value: 'trait' },
];

/** A column of the matrix: its statement, and that statement's place in the order seen, from 0. */
export interface MatrixColumn {
  item: ItemId;
  seen: number;
}

/**
 * The matrix's columns for `statements` (in the order seen): as they are, or grouped by trait in the test's
 * trait order, each group still in the order seen.
 */
export function orderColumns(statements: ReadonlyArray<ItemId>, order: ColumnOrder): Array<MatrixColumn> {
  const columns = statements.map((item, seen) => ({ item, seen }));
  if (order === 'seen') {
    return columns;
  }
  const rank = ({ item }: MatrixColumn) => TRAITS.indexOf(itemById(item).trait);
  return columns.toSorted((a, b) => rank(a) - rank(b));
}
