import { useState } from 'react';
import type { Answers } from '../room/protocol.ts';
import { useElementSize } from '../hooks/effects/useElementSize.ts';
import { cellClassOf } from './answerColours.ts';
import type { MatrixColumn } from './columnOrder.ts';
import { hoverOf } from './HoverStore.ts';
import { MatrixHighlight } from './MatrixHighlight.tsx';
import type { HoverStore } from './HoverStore.ts';
import { isLabelled, matrixLayout } from './matrixLayout.ts';
import type { MatrixVariant } from './matrixLayout.ts';
import type { MatrixRow } from './matrixRows.ts';
import { shownAnswer } from './reversedItems.ts';
import type { ReversedView } from './reversedItems.ts';

interface VoteMatrixProps {
  rows: ReadonlyArray<MatrixRow>;
  /** The statements, in the order to show them; each is numbered, and hovered, by its place in the order seen. */
  columns: ReadonlyArray<MatrixColumn>;
  /** Told what the pointer or focus is on; the matrix itself never reads it, so hovering never re-renders it. */
  hover: HoverStore;
  variant: MatrixVariant;
  /** Whether reversed statements' answers show as given or flipped. */
  reversed: ReversedView;
}

/** One participant's cells: one plain element each, coloured by class, so 200 × 50 re-renders cheaply. */
function Cells({ answers, columns, reversed }: { answers: Answers; columns: ReadonlyArray<MatrixColumn>; reversed: ReversedView }) {
  return columns.map(({ item, seen }) => <span className={cellClassOf(shownAnswer(item, answers[item], reversed))} data-column={seen} key={item} />);
}

function rowName(row: MatrixRow): string {
  return row.kind === 'phone' ? `📱 ${row.name}` : row.name;
}

/** The column numbers: a button per column, showing its number only every so many when they don't all fit. */
function ColumnHeaders({ columns, step }: { columns: ReadonlyArray<MatrixColumn>; step: number }) {
  return columns.map(({ item, seen }, i) => (
    <button aria-label={`Statement ${seen + 1}`} className="vote-header" data-column={seen} key={item} type="button">
      <span className={isLabelled(i, step) ? 'vote-label' : 'vote-label vote-label-hidden'}>{seen + 1}</span>
    </button>
  ));
}

/**
 * Everyone's answers, live: a row per participant and a column per chosen statement, numbered 1…N in the order
 * seen, whatever order `columns` puts them in. In `cells`, cells and headers have fixed sizes, so new answers never
 * move anything, and new rows only extend it downward (and new statements rightward, in the order seen);
 * in the lobby it lists the participants with no columns yet. `pixel-fit` stretches them to fill a tall box,
 * and where the numbers or names don't all fit, shows only every so many (1, 5, 10…), each centred on its own
 * column or row. Every column number and row name is a button, shown or not, so each statement and person can
 * be hovered or reached by keyboard for the info area; one handler on the grid serves them all, and cells too.
 */
export function VoteMatrix({ rows, columns, hover, variant, reversed }: VoteMatrixProps) {
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const size = useElementSize(variant === 'pixel-fit' ? box : null);
  const layout = matrixLayout(variant, columns.length, rows.length, size);
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
        <ColumnHeaders columns={columns} step={layout.columnStep} />
        {rows.map((row, r) => (
          <div className={row.connected ? 'contents' : 'contents opacity-40'} data-row={row.id} key={row.id}>
            <button aria-label={rowName(row)} className="vote-name" type="button">
              <span className={isLabelled(r, layout.rowStep) ? 'vote-label' : 'vote-label vote-label-hidden'}>{rowName(row)}</span>
            </button>
            <Cells answers={row.answers} columns={columns} reversed={reversed} />
          </div>
        ))}
      </div>
    </div>
  );
}
