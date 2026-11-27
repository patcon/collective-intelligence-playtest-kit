import { useSyncExternalStore } from 'react';
import type { ItemId } from '../items/items.ts';
import type { Person } from '../simulation/responses.ts';
import type { HoverStore } from './HoverStore.ts';
import { personLine, statementLine } from './infoLines.ts';
import type { MatrixRow } from './matrixRows.ts';

interface InfoAreaProps {
  hover: HoverStore;
  rows: ReadonlyArray<MatrixRow>;
  statements: ReadonlyArray<ItemId>;
  /** This page's sims' people, by sim id. */
  people: ReadonlyMap<string, Person>;
}

/**
 * The statement and the person last hovered or focused in the matrix, one line each. A fixed height that
 * never changes, empty or full, so nothing on the page moves as it updates.
 */
export function InfoArea({ hover, rows, statements, people }: InfoAreaProps) {
  const { column, row: rowId } = useSyncExternalStore(hover.subscribe, hover.getState);
  const statement = column === null ? null : statementLine(statements, column);
  const row = rows.find((r) => r.id === rowId);
  return (
    <div aria-live="polite" className="flex h-14 flex-col justify-center gap-1 overflow-hidden rounded-md bg-kumo-recessed px-4 text-sm">
      <p className="truncate">{statement ?? <span className="text-kumo-subtle">Hover or focus a column number to see its statement.</span>}</p>
      <p className="truncate">
        {row ? personLine(row, people.get(row.id), statements.length) : <span className="text-kumo-subtle">Hover or focus a row to see who it is.</span>}
      </p>
    </div>
  );
}
