import { describe, expect, it } from 'vitest';
import { createPlayheadEaser } from './playheads.ts';

describe('createPlayheadEaser', () => {
  it('starts hidden and stays hidden without a target or a path', () => {
    const easer = createPlayheadEaser(2);
    expect(easer.visible).toEqual([false, false]);
    easer.step([null, 3], [10, 0], null);
    expect(easer.visible).toEqual([false, false]);
  });

  it('snaps to its target when it first appears, clamped to the path', () => {
    const easer = createPlayheadEaser(2);
    easer.step([4, 99], [10, 5], null);
    expect(easer.visible).toEqual([true, true]);
    expect(easer.positions).toEqual([4, 4]);
  });

  it('chases a moving target a fifth of the way each frame', () => {
    const easer = createPlayheadEaser(1);
    easer.step([0], [20], null);
    easer.step([10], [20], null);
    expect(easer.positions[0]).toBeCloseTo(2);
    easer.step([10], [20], null);
    expect(easer.positions[0]).toBeCloseTo(3.6);
  });

  it('eases in step with a new layout, even when the path grew by several nodes', () => {
    const easer = createPlayheadEaser(1);
    easer.step([2], [3], null);
    easer.startLayout();
    easer.step([6], [7], 0.5);
    expect(easer.positions[0]).toBeCloseTo(4);
    easer.step([6], [7], 1);
    expect(easer.positions[0]).toBeCloseTo(6);
  });

  it('treats a jump mid-tween as a seek, and chases it instead', () => {
    const easer = createPlayheadEaser(1);
    easer.step([2], [20], null);
    easer.startLayout();
    easer.step([3], [20], 0.1);
    expect(easer.positions[0]).toBeCloseTo(2.1);
    easer.step([10], [20], 0.2);
    expect(easer.positions[0]).toBeCloseTo(2.1 + (10 - 2.1) * 0.2);
  });

  it('snaps again after being hidden', () => {
    const easer = createPlayheadEaser(1);
    easer.step([2], [10], null);
    easer.step([null], [10], null);
    expect(easer.visible[0]).toBe(false);
    easer.step([8], [10], null);
    expect(easer.visible[0]).toBe(true);
    expect(easer.positions[0]).toBe(8);
  });
});
