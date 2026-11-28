import { memo } from 'react';
import type { CSSProperties } from 'react';
import type { Item, ItemId, Trait } from '../items/items.ts';
import { clusterColour } from './clusters.ts';
import type { SortBy } from './orders.ts';
import type { Participant, StreamSnapshot } from './stream.ts';
import { valueOf } from './table.ts';
import type { Shown } from './table.ts';
import './prototype.css';

/** PROTOTYPE. Participants by statements, every cell placed by the current orders and moved by transitions. */

export interface Hover {
  row: string | null;
  col: ItemId | null;
  /** Over the names column: outline the hovered person's whole cluster. */
  group: boolean;
}

export const NO_HOVER: Hover = { col: null, group: false, row: null };

export const TRAIT_COLOURS: Readonly<Record<Trait, string>> = {
  AGR: '#16a34a',
  CSN: '#2563eb',
  EST: '#9333ea',
  EXT: '#f59e0b',
  OPN: '#db2777',
};

export const LABEL_WIDTH = 64;
const HEADER_HEIGHT = 22;

/**
 * Every row and column gets a slot `cell` pixels long (columns `width`, rows `height`), and everything in it
 * (cells, the header and its trait bar, the row's name, the highlights) fills the first `cell - gap` of them, the
 * box, leaving a `gap` (1px, or 0 with gaps off) after: so it all lines up, and a highlight's 1px outline falls in
 * the gaps either side. A box is never under 1px, so 1px rows simply lose their gap.
 */
function boxOf(cell: number, gap: number): number {
  return Math.max(1, cell - gap);
}

/** Milliseconds each position waits before moving, so the whole ripple takes at most about half a second. */
function stagger(count: number): number {
  return Math.min(8, 500 / Math.max(1, count));
}

function cellClass(value: number | null | undefined): string {
  if (value === undefined) {
    return 'pm-cell pm-blank';
  }
  return value === null ? 'pm-cell pm-skip' : `pm-cell pm-a${value}`;
}

/**
 * What's under the point (`x`, `y`) in the matrix's own pixels, from the orders rather than the element hit,
 * so the 1px gaps between cells count as the cell, not as nothing.
 */
function hoverAt(x: number, y: number, size: CellSize, rowOrder: ReadonlyArray<string>, colOrder: ReadonlyArray<ItemId>): Hover {
  const col = x >= LABEL_WIDTH ? (colOrder[Math.floor((x - LABEL_WIDTH) / size.width)] ?? null) : null;
  const row = y >= HEADER_HEIGHT ? (rowOrder[Math.floor((y - HEADER_HEIGHT) / size.height)] ?? null) : null;
  return { col, group: x < LABEL_WIDTH && row !== null, row };
}

/** The runs of consecutive positions in `positions` (sorted), as [first, count]: one per contiguous block. */
function runsOf(positions: ReadonlyArray<number>): Array<[number, number]> {
  const runs: Array<[number, number]> = [];
  for (const p of positions) {
    const last = runs.at(-1);
    if (last && last[0] + last[1] === p) {
      last[1] += 1;
    } else {
      runs.push([p, 1]);
    }
  }
  return runs;
}

/** A cell's slot, in whole pixels: square, or wider to fill the width. */
export interface CellSize {
  width: number;
  height: number;
  /** Between cells: 1px, or 0 for none. */
  gap: number;
}

interface RowProps {
  participant: Participant;
  statements: ReadonlyArray<Item>;
  shown: Shown;
  width: number;
  height: number;
  gap: number;
  y: number;
  delay: number;
  cluster: number | undefined;
}

const Row = memo(function Row({ participant, statements, shown, width, height, gap, y, delay, cluster }: RowProps) {
  return (
    <div className="pm-row pm-moves" data-row={participant.id} style={{ height, transform: `translateY(${y}px)`, transitionDelay: `${delay}ms` }}>
      <span className="pm-name" style={{ height: boxOf(height, gap), width: LABEL_WIDTH - 4 }}>
        <span className="pm-swatch" style={{ background: clusterColour(cluster) }} />
        {height >= 9 ? participant.name : null}
      </span>
      {statements.map((s) => {
        const answer = participant.answers.get(s.id);
        const value = answer === undefined ? undefined : valueOf(answer, s, shown);
        return (
          <span
            className={cellClass(value)}
            data-col={s.id}
            key={s.id}
            style={{
              height: boxOf(height, gap),
              left: LABEL_WIDTH,
              transform: `translateX(var(--x-${s.id}))`,
              transitionDelay: `var(--dx-${s.id}), 0ms`,
              width: boxOf(width, gap),
            }}
          />
        );
      })}
    </div>
  );
});

interface ClusterOutlineProps {
  clusters: ReadonlyMap<string, number>;
  hoverRow: string | null;
  rowOrder: ReadonlyArray<string>;
  size: CellSize;
  width: number;
}

/** An outline in the cluster's colour around everyone in the hovered person's cluster: one per contiguous block. */
function ClusterOutline({ clusters, hoverRow, rowOrder, size, width }: ClusterOutlineProps) {
  const label = hoverRow === null ? -1 : (clusters.get(hoverRow) ?? -1);
  if (label < 0) {
    return null;
  }
  const positions = rowOrder.flatMap((id, i) => (clusters.get(id) === label ? [i] : []));
  return runsOf(positions).map(([first, count]) => (
    <div
      className="pm-group"
      key={first}
      style={{ outlineColor: clusterColour(label), height: count * size.height - size.gap, left: 0, top: first * size.height, width: width - size.gap }}
    />
  ));
}

interface MatrixProps {
  snapshot: StreamSnapshot;
  rowOrder: ReadonlyArray<string>;
  colOrder: ReadonlyArray<ItemId>;
  clusters: ReadonlyMap<string, number>;
  shown: Shown;
  size: CellSize;
  hover: Hover;
  onHover: (hover: Hover) => void;
  sortBy: SortBy | null;
  onSortBy: (id: ItemId) => void;
}

export function Matrix({ snapshot, rowOrder, colOrder, clusters, shown, size, hover, onHover, sortBy, onSortBy }: MatrixProps) {
  const { width, height, gap } = size;
  const { statements, participants } = snapshot;
  const rowPos = new Map(rowOrder.map((id, i) => [id, i]));
  const colStep = stagger(colOrder.length);
  const rowStep = stagger(rowOrder.length);
  const vars: Record<string, string> = {};
  colOrder.forEach((id, i) => {
    vars[`--x-${id}`] = `${i * width}px`;
    vars[`--dx-${id}`] = `${Math.round(i * colStep)}ms`;
  });
  const seenNumber = new Map(statements.map((s, i) => [s.id, i + 1]));
  const hoverRow = hover.row === null ? undefined : rowPos.get(hover.row);

  return (
    <div
      className="pm"
      onPointerLeave={() => onHover(NO_HOVER)}
      onPointerMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const next = hoverAt(event.clientX - bounds.left, event.clientY - bounds.top, size, rowOrder, colOrder);
        if (next.row !== hover.row || next.col !== hover.col || next.group !== hover.group) {
          onHover(next);
        }
      }}
      style={{ ...(vars as CSSProperties), height: HEADER_HEIGHT + rowOrder.length * height, width: LABEL_WIDTH + colOrder.length * width }}
    >
      {statements.map((s) => (
        <button
          className="pm-col pm-moves"
          data-col={s.id}
          data-sorted={sortBy?.id === s.id || undefined}
          key={s.id}
          onClick={() => onSortBy(s.id)}
          style={{ height: HEADER_HEIGHT - 2, left: LABEL_WIDTH, transform: `translateX(var(--x-${s.id}))`, transitionDelay: `var(--dx-${s.id})`, width: boxOf(width, gap) }}
          title={`${seenNumber.get(s.id)}. ${s.text} (${s.trait}${s.keyed === -1 ? ', reversed' : ''}). Click to sort people by it.`}
          type="button"
        >
          {width >= 12 ? (sortBy?.id === s.id ? (sortBy.dir === 1 ? '▼' : '▲') : seenNumber.get(s.id)) : null}
          <span className="pm-trait" style={{ background: TRAIT_COLOURS[s.trait], opacity: s.keyed === -1 ? 0.45 : 1 }} />
        </button>
      ))}
      <div style={{ left: 0, position: 'absolute', right: 0, top: HEADER_HEIGHT }}>
        {participants.map((p) => {
          const pos = rowPos.get(p.id) ?? 0;
          return (
            <Row
              gap={gap}
              height={height}
              cluster={clusters.get(p.id)}
              delay={Math.round(pos * rowStep)}
              key={p.id}
              participant={p}
              shown={shown}
              statements={statements}
              width={width}
              y={pos * height}
            />
          );
        })}
        {hoverRow === undefined || hover.group ? null : (
          <div className="pm-hl" style={{ height: boxOf(height, gap), left: 0, top: 0, transform: `translateY(${hoverRow * height}px)`, width: LABEL_WIDTH + colOrder.length * width - gap }} />
        )}
        {hover.group ? <ClusterOutline clusters={clusters} hoverRow={hover.row} rowOrder={rowOrder} size={size} width={LABEL_WIDTH + colOrder.length * width} /> : null}
      </div>
      {hover.col === null ? null : (
        <div
          className="pm-hl"
          style={{
            height: HEADER_HEIGHT + rowOrder.length * height - 1,
            left: LABEL_WIDTH,
            top: 0,
            transform: `translateX(var(--x-${hover.col}))`,
            width: boxOf(width, gap),
          }}
        />
      )}
    </div>
  );
}
