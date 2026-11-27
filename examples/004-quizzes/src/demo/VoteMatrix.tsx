import type { ItemId } from '../items/items.ts';
import type { Answers } from '../room/protocol.ts';
import { cellClassOf } from './answerColours.ts';
import type { MatrixRow } from './matrixRows.ts';

interface VoteMatrixProps {
  rows: ReadonlyArray<MatrixRow>;
  statements: ReadonlyArray<ItemId>;
}

/** One participant's cells: one plain element each, coloured by class, so 200 × 50 re-renders cheaply. */
function Cells({ answers, statements }: { answers: Answers; statements: ReadonlyArray<ItemId> }) {
  return statements.map((item) => <span className={cellClassOf(answers[item])} key={item} />);
}

/**
 * Everyone's answers, live: a row per participant and a column per chosen statement, numbered 1…N. Cells and
 * headers have fixed sizes, so new answers never move anything, and new rows only extend it downward. In the
 * lobby it lists the participants with no columns yet.
 */
export function VoteMatrix({ rows, statements }: VoteMatrixProps) {
  const columns = { gridTemplateColumns: `8rem repeat(${statements.length}, var(--vote-cell))` };
  return (
    <div className="overflow-x-auto">
      <div className="vote-matrix grid w-max gap-px text-xs" style={columns}>
        <span />
        {statements.map((item, i) => (
          <span className="text-center text-[10px] tabular-nums text-kumo-subtle" key={item}>
            {i + 1}
          </span>
        ))}
        {rows.map((row) => (
          <div className={row.connected ? 'contents' : 'contents opacity-40'} key={row.id}>
            <span className="truncate pr-2">{row.kind === 'phone' ? `📱 ${row.name}` : row.name}</span>
            <Cells answers={row.answers} statements={statements} />
          </div>
        ))}
      </div>
    </div>
  );
}
