import { itemById, TRAIT_NAMES } from '../items/items.ts';
import type { ItemId } from '../items/items.ts';
import type { Person } from '../simulation/responses.ts';
import type { MatrixRow } from './matrixRows.ts';

/** A statement, as the info area shows it: `#7 EXT2 · Extraversion, reversed — “I don't talk a lot.”` */
export function statementLine(statements: ReadonlyArray<ItemId>, column: number): string | null {
  const id = statements[column];
  if (id === undefined) {
    return null;
  }
  const { trait, keyed, text } = itemById(id);
  return `#${column + 1} ${id} · ${TRAIT_NAMES[trait]}${keyed === -1 ? ', reversed' : ''} — “${text}”`;
}

/** A participant, as the info area shows it, with the real data behind this page's own sims. */
export function personLine(row: MatrixRow, person: Person | undefined, total: number): string {
  const answered = `${Object.keys(row.answers).length} / ${total} answered`;
  if (row.kind === 'phone') {
    return `${row.name} · real phone · ${answered}`;
  }
  if (!person) {
    return `${row.name} · from another tab, so no details here · ${answered}`;
  }
  return `${row.name} · sample row ${person.row} · ${person.country} · skipped ${person.skipped} of 50 in the real data · ${answered}`;
}
