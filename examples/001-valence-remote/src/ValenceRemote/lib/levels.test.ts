import { describe, expect, it } from 'vitest';
import { createQuantizer, levelsFromParam, levelValues, tickValues } from './levels.ts';

describe('createQuantizer', () => {
  it('snaps to {−1, 0, +1} with 3 levels', () => {
    const quantize = createQuantizer(3);
    expect(quantize(0.9)).toBe(1);
    expect(createQuantizer(3)(0.1)).toBe(0);
    expect(createQuantizer(3)(-0.8)).toBe(-1);
  });

  it('snaps to {−1, +1} with 2 levels', () => {
    expect(createQuantizer(2)(0.1)).toBe(1);
    expect(createQuantizer(2)(-0.1)).toBe(-1);
  });

  it('holds a level until the reading is well past its edge', () => {
    const quantize = createQuantizer(2);
    expect(quantize(0.1)).toBe(1);
    expect(quantize(-0.4)).toBe(1);
    expect(quantize(-0.6)).toBe(-1);
    expect(quantize(0.4)).toBe(-1);
  });

  it('sends steps of 0.1 without float noise', () => {
    expect(createQuantizer(21)(-0.71)).toBe(-0.7);
    expect(createQuantizer(21)(0.29)).toBe(0.3);
  });

  it('starts afresh after null', () => {
    const quantize = createQuantizer(2);
    quantize(1);
    expect(quantize(null)).toBeNull();
    expect(quantize(-0.1)).toBe(-1);
  });

  it('passes readings through untouched at full precision', () => {
    expect(createQuantizer(null)(0.123456789)).toBe(0.123456789);
  });
});

describe('levelValues', () => {
  it('spreads levels evenly from −1 to +1', () => {
    expect(levelValues(3)).toEqual([-1, 0, 1]);
    expect(levelValues(5)).toEqual([-1, -0.5, 0, 0.5, 1]);
  });
});

describe('levelsFromParam', () => {
  it('reads a count or full precision, and nothing else', () => {
    expect(levelsFromParam('3')).toBe(3);
    expect(levelsFromParam('full')).toBeNull();
    expect(levelsFromParam('1')).toBeUndefined();
    expect(levelsFromParam('2.5')).toBeUndefined();
    expect(levelsFromParam(null)).toBeUndefined();
  });
});

describe('tickValues', () => {
  it('marks the levels between the ends, only when coarse', () => {
    expect(tickValues(3)).toEqual([0]);
    expect(tickValues(2)).toEqual([]);
    expect(tickValues(201)).toEqual([]);
    expect(tickValues(null)).toEqual([]);
  });
});
