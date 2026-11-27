import { describe, expect, it } from 'vitest';
import { isLabelled, matrixLayout, nextVariant } from './matrixLayout.ts';

describe('nextVariant', () => {
  it('cycles cells, pixel-fit and back', () => {
    expect([nextVariant('cells'), nextVariant('pixel-fit')]).toEqual(['pixel-fit', 'cells']);
  });
});

describe('matrixLayout', () => {
  it('labels every column and row, with shapes, in the cells variant', () => {
    expect(matrixLayout('cells', 3, 2, null)).toMatchObject({ columnStep: 1, flat: false, rowStep: 1 });
  });

  // The box is 600 tall and 1128 wide, so 1000 × 582 is left for cells after the labels.
  it.each([
    { columns: 20, rows: 10, columnStep: 1, rowStep: 1, flat: false },
    { columns: 20, rows: 200, columnStep: 1, rowStep: 5, flat: true },
    { columns: 100, rows: 10, columnStep: 5, rowStep: 1, flat: false },
    { columns: 1000, rows: 582, columnStep: 25, rowStep: 25, flat: true },
  ])('in pixel-fit, labels every $columnStep columns and $rowStep rows ($columns × $rows)', ({ columns, rows, ...expected }) => {
    expect(matrixLayout('pixel-fit', columns, rows, { height: 600, width: 1128 })).toMatchObject(expected);
  });

  it('stretches pixel-fit rows and columns to fill the box after the labels', () => {
    expect(matrixLayout('pixel-fit', 5, 4, { height: 600, width: 1128 })).toMatchObject({
      columns: '8rem repeat(5, minmax(0, 1fr))',
      rows: '18px repeat(4, minmax(0, 1fr))',
    });
  });
});

/** The indices, of `count`, that show a label at `step`. */
function labelled(count: number, step: number): Array<number> {
  return Array.from({ length: count }, (_, i) => i).filter((i) => isLabelled(i, step));
}

describe('isLabelled', () => {
  it('labels every one at a step of 1', () => {
    expect(labelled(3, 1)).toEqual([0, 1, 2]);
  });

  it('labels the 1st, 5th, 10th and 15th at a step of 5', () => {
    expect(labelled(17, 5)).toEqual([0, 4, 9, 14]);
  });
});
