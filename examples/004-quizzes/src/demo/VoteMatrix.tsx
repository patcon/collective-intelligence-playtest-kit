import type { ItemId } from '../items/items.ts';
import type { Answers } from '../room/protocol.ts';
import { cellClassOf } from './answerColours.ts';
import { hoverOf } from './HoverStore.ts';
import type { HoverStore } from './HoverStore.ts';
import type { MatrixRow } from './matrixRows.ts';

interface VoteMatrixProps {
  rows: ReadonlyArray<MatrixRow>;
  statements: ReadonlyArray<ItemId>;
  /** Told what the pointer or focus is on; the matrix itself never reads it, so hovering never re-renders it. */
  hover: HoverStore;
}

/** One participant's cells: one plain element each, coloured by class, so 200 × 50 re-renders cheaply. */
function Cells({ answers, statements }: { answers: Answers; statements: ReadonlyArray<ItemId> }) {
  return statements.map((item, i) => <span className={cellClassOf(answers[item])} data-column={i} key={item} />);
}

/**
 * Everyone's answers, live: a row per participant and a column per chosen statement, numbered 1…N. Cells and
 * headers have fixed sizes, so new answers never move anything, and new rows only extend it downward. In the
 * lobby it lists the participants with no columns yet. Column numbers and row names are buttons, so the
 * info area can be reached by keyboard too; one handler on the grid serves them all.
 */
export function VoteMatrix({ rows, statements, hover }: VoteMatrixProps) {
  const columns = { gridTemplateColumns: `8rem repeat(${statements.length}, var(--vote-cell))` };
  return (
    <div className="overflow-x-auto">
      <div
        className="vote-matrix grid w-max gap-px text-xs"
        onFocus={(event) => hover.set(hoverOf(event.target))}
        onPointerOver={(event) => hover.set(hoverOf(event.target))}
        style={columns}
      >
        <span />
        {statements.map((item, i) => (
          <button aria-label={`Statement ${i + 1}`} className="vote-header" data-column={i} key={item} type="button">
            {i + 1}
          </button>
        ))}
        {rows.map((row) => (
          <div className={row.connected ? 'contents' : 'contents opacity-40'} data-row={row.id} key={row.id}>
            <button className="vote-name" type="button">
              {row.kind === 'phone' ? `📱 ${row.name}` : row.name}
            </button>
            <Cells answers={row.answers} statements={statements} />
          </div>
        ))}
      </div>
    </div>
  );
}
