/** How the vote matrix is drawn: fixed-size labelled cells, or stretched to fill its box. */
export type MatrixVariant = 'cells' | 'pixel-fit';

export const MATRIX_VARIANTS: ReadonlyArray<{ label: string; value: MatrixVariant }> = [
  { label: 'Cells', value: 'cells' },
  { label: 'Pixel fit', value: 'pixel-fit' },
];

/** Room (px) a column number needs, up to three digits. */
const HEADER_WIDTH = 18;
/** Room (px) a name needs. */
const NAME_HEIGHT = 14;
/** The name column (8rem) and header row, in px, taken from the box before dividing it among cells. */
const NAME_COLUMN = 128;
const HEADER_ROW = 18;
/** Below this cell size (px), a skip's cross and a blank's dot (10px in `styles.css`) don't fit, so they're flat fills. */
const MIN_SHAPE_SIZE = 10;
/** Label every 1st, 5th, 10th… column or row: the first step that leaves each label room. */
const STEPS = [1, 5, 10, 25, 50, 100, 250, 500, 1000];

export interface MatrixLayout {
  /** The grid's `grid-template-columns`. */
  columns: string;
  /** The grid's `grid-template-rows`, when it stretches to fill its box. */
  rows?: string;
  /** Label every this-many columns (see `isLabelled`). */
  columnStep: number;
  /** Label every this-many rows. */
  rowStep: number;
  /** Whether skips and blanks are flat fills rather than shapes. */
  flat: boolean;
}

/** `count` grid tracks of `size`, or none: `repeat(0, …)` is invalid and would throw out the whole template. */
function tracks(count: number, size: string): string {
  return count > 0 ? ` repeat(${count}, ${size})` : '';
}

function stepFor(cellSize: number, room: number): number {
  return STEPS.find((step) => step * cellSize >= room) ?? STEPS.at(-1) ?? 1;
}

/**
 * The grid for `variant`, with `columnCount` statements and `rowCount` participants. `pixel-fit` divides `box`
 * (less the labels) among them, and labels only as many columns and rows as have room.
 */
export function matrixLayout(variant: MatrixVariant, columnCount: number, rowCount: number, box: { height: number; width: number } | null): MatrixLayout {
  if (variant === 'cells') {
    return { columnStep: 1, columns: `8rem${tracks(columnCount, 'var(--vote-cell)')}`, flat: false, rowStep: 1 };
  }
  const cellWidth = box ? (box.width - NAME_COLUMN) / Math.max(columnCount, 1) : 0;
  const cellHeight = box ? (box.height - HEADER_ROW) / Math.max(rowCount, 1) : 0;
  return {
    columnStep: stepFor(cellWidth, HEADER_WIDTH),
    columns: `8rem${tracks(columnCount, 'minmax(0, 1fr)')}`,
    flat: Math.min(cellWidth, cellHeight) < MIN_SHAPE_SIZE,
    rowStep: stepFor(cellHeight, NAME_HEIGHT),
    rows: `${HEADER_ROW}px${tracks(rowCount, 'minmax(0, 1fr)')}`,
  };
}

/**
 * Whether the column or row at `index` shows its label when labelling every `step`: the 1st, then the
 * step-th, 2·step-th… (so 1, 5, 10, 15 for a step of 5).
 */
export function isLabelled(index: number, step: number): boolean {
  return index === 0 || (index + 1) % step === 0;
}
