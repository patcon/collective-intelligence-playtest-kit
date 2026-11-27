import { useState } from 'react';
import type { ItemId } from '../items/items.ts';
import type { Answers } from '../room/protocol.ts';
import { useElementSize } from '../hooks/effects/useElementSize.ts';
import { cellClassOf } from './answerColours.ts';
import { hoverOf } from './HoverStore.ts';
import { MatrixHighlight } from './MatrixHighlight.tsx';
import type { HoverStore } from './HoverStore.ts';
import { isLabelled, matrixLayout } from './matrixLayout.ts';
import type { MatrixVariant } from './matrixLayout.ts';
import type { MatrixRow } from './matrixRows.ts';

interface VoteMatrixProps {
  rows: ReadonlyArray<MatrixRow>;
  statements: ReadonlyArray<ItemId>;
  /** Told what the pointer or focus is on; the matrix itself never reads it, so hovering never re-renders it. */
  hover: HoverStore;
  variant: MatrixVariant;
}

/** One participant's cells: one plain element each, coloured by class, so 200 × 50 re-renders cheaply. */
function Cells({ answers, statements }: { answers: Answers; statements: ReadonlyArray<ItemId> }) {
  return statements.map((item, i) => <span className={cellClassOf(answers[item])} data-column={i} key={item} />);
}

function rowName(row: MatrixRow): string {
  return row.kind === 'phone' ? `📱 ${row.name}` : row.name;
}

/** The column numbers: a button per column, showing its number only every so many when they don't all fit. */
function ColumnHeaders({ statements, step }: { statements: ReadonlyArray<ItemId>; step: number }) {
  return statements.map((item, i) => (
    <button aria-label={`Statement ${i + 1}`} className="vote-header" data-column={i} key={item} type="button">
      <span className={isLabelled(i, step) ? 'vote-label' : 'vote-label vote-label-hidden'}>{i + 1}</span>
    </button>
  ));
}

/**
 * Everyone's answers, live: a row per participant and a column per chosen statement, numbered 1…N. In `cells`,
 * cells and headers have fixed sizes, so new answers never move anything, and new rows only extend it downward;
 * in the lobby it lists the participants with no columns yet. `pixel-fit` stretches them to fill a tall box,
 * and where the numbers or names don't all fit, shows only every so many (1, 5, 10…), each centred on its own
 * column or row. Every column number and row name is a button, shown or not, so each statement and person can
 * be hovered or reached by keyboard for the info area; one handler on the grid serves them all, and cells too.
 */
export function VoteMatrix({ rows, statements, hover, variant }: VoteMatrixProps) {
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const size = useElementSize(variant === 'pixel-fit' ? box : null);
  const layout = matrixLayout(variant, statements.length, rows.length, size);
  return (
    <div className={variant === 'pixel-fit' ? 'h-[70vh]' : 'overflow-x-auto'} ref={setBox}>
      <MatrixHighlight hover={hover} />
      <div
        className={`vote-matrix grid text-xs ${variant === 'pixel-fit' ? 'vote-fit size-full' : 'w-max gap-px'}`}
        data-flat={layout.flat || undefined}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            hover.set({ active: false });
          }
        }}
        onFocus={(event) => hover.set({ ...hoverOf(event.target), active: true })}
        onPointerLeave={() => hover.set({ active: false })}
        onPointerOver={(event) => hover.set({ ...hoverOf(event.target), active: true })}
        style={{ gridTemplateColumns: layout.columns, gridTemplateRows: layout.rows }}
      >
        <span />
        <ColumnHeaders statements={statements} step={layout.columnStep} />
        {rows.map((row, r) => (
          <div className={row.connected ? 'contents' : 'contents opacity-40'} data-row={row.id} key={row.id}>
            <button aria-label={rowName(row)} className="vote-name" type="button">
              <span className={isLabelled(r, layout.rowStep) ? 'vote-label' : 'vote-label vote-label-hidden'}>{rowName(row)}</span>
            </button>
            <Cells answers={row.answers} statements={statements} />
          </div>
        ))}
      </div>
    </div>
  );
}
