import { BufferGeometry, Color } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TWEEN_MS, createLayoutTween } from './layoutTween.ts';
import type { ViewerPoint, ViewerTrack } from '../types.ts';

const TRACKS: ReadonlyArray<ViewerTrack> = [{ label: 'A' }, { label: 'B' }];
const BG = new Color(0, 0, 0);
/** Fixed start time for every retarget, so the tests pick the tween's progress. */
const T0 = 1000;

const point = (key: string, x: number, track = 0): ViewerPoint => ({
  key,
  position: [x, 0, 0],
  track,
});

/** Slot `i`'s displayed x. */
const xOf = (tween: ReturnType<typeof createLayoutTween>, i: number) => tween.positions[i * 3];
/** Slot `i`'s displayed colour. */
const rgbOf = (tween: ReturnType<typeof createLayoutTween>, i: number) =>
  Array.from(tween.colors.subarray(i * 3, i * 3 + 3));

beforeEach(() => {
  vi.spyOn(performance, 'now').mockReturnValue(T0);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createLayoutTween', () => {
  it('starts empty and idle', () => {
    const tween = createLayoutTween(2);
    expect(tween.count).toBe(0);
    expect(tween.drawCount).toBe(0);
    expect(tween.trackIndices).toEqual([[], []]);
    expect(tween.step(T0)).toBeNull();
  });

  it('shows points in order, grouped into each track path, dropping unknown tracks', () => {
    const tween = createLayoutTween(2);
    tween.retarget(
      [point('a', 0), point('b', 1, 1), point('x', 9, 5), point('c', 2), point('y', 9, 0.5)],
      TRACKS,
      BG,
    );
    expect(tween.count).toBe(3);
    expect(tween.slots.map((s) => [s.point.key, s.index])).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 3],
    ]);
    expect(tween.trackIndices).toEqual([[0, 2], [1]]);
  });

  it('fades new points in from the background, in place', () => {
    const tween = createLayoutTween(2);
    tween.retarget([point('a', 0.5)], TRACKS, BG);
    expect(xOf(tween, 0)).toBeCloseTo(0.5);
    expect(rgbOf(tween, 0)).toEqual([0, 0, 0]);

    expect(tween.step(T0 + TWEEN_MS)).toBe(1);
    expect(xOf(tween, 0)).toBeCloseTo(0.5);
    expect(rgbOf(tween, 0).some((c) => c > 0)).toBe(true);
    expect(tween.step(T0 + TWEEN_MS + 1)).toBeNull();
  });

  it('moves a known key from where it is, even mid-tween', () => {
    const tween = createLayoutTween(2);
    tween.retarget([point('a', 0)], TRACKS, BG);
    tween.step(T0 + TWEEN_MS);

    const settled = rgbOf(tween, 0);
    tween.retarget([point('a', 1)], TRACKS, BG);
    expect(xOf(tween, 0)).toBeCloseTo(0);
    // A shown point keeps its colour rather than fading in from the background again
    expect(rgbOf(tween, 0)).toEqual(settled);
    tween.step(T0 + TWEEN_MS / 2);
    expect(xOf(tween, 0)).toBeCloseTo(0.5);

    // Retarget mid-move: start from the halfway point, not from 0
    tween.retarget([point('a', 2)], TRACKS, BG);
    expect(xOf(tween, 0)).toBeCloseTo(0.5);
    tween.step(T0 + TWEEN_MS);
    expect(xOf(tween, 0)).toBeCloseTo(2);
  });

  it('fades removed points out after the shown ones, then drops them', () => {
    const tween = createLayoutTween(2);
    const geo = new BufferGeometry();
    tween.bind(geo);
    tween.retarget([point('a', 0), point('b', 1), point('c', 2, 1)], TRACKS, BG);
    tween.step(T0 + TWEEN_MS);
    expect(geo.drawRange.count).toBe(3);

    tween.retarget([point('a', 0)], TRACKS, BG);
    expect(tween.count).toBe(1);
    expect(tween.drawCount).toBe(3);
    expect(geo.drawRange.count).toBe(3);
    // Track 1 lost all its points, so its path keeps the fading one until the end
    expect(tween.trackIndices).toEqual([[0], [2]]);
    expect(xOf(tween, 1)).toBeCloseTo(1);

    tween.step(T0 + TWEEN_MS);
    expect(rgbOf(tween, 1)).toEqual([0, 0, 0]);
    expect(tween.drawCount).toBe(1);
    expect(geo.drawRange.count).toBe(1);
    expect(tween.trackIndices).toEqual([[0], []]);
  });

  it('grows its buffers past the initial capacity and rebinds the geometry', () => {
    const tween = createLayoutTween(1);
    const geo = new BufferGeometry();
    tween.bind(geo);
    const many = Array.from({ length: 100 }, (_, i) => point(`p${i}`, i));
    tween.retarget(many, TRACKS, BG);
    tween.step(T0 + TWEEN_MS);
    expect(geo.getAttribute('position').count).toBeGreaterThanOrEqual(100);
    expect(geo.getAttribute('position').array).toBe(tween.positions);
    expect(xOf(tween, 99)).toBeCloseTo(99);
  });

  it('restores the draw range when a new geometry is bound (a remount)', () => {
    const tween = createLayoutTween(1);
    tween.retarget([point('a', 0), point('b', 1)], TRACKS, BG);
    const geo = new BufferGeometry();
    tween.bind(geo);
    expect(geo.drawRange.count).toBe(2);
    expect(geo.getAttribute('aSeed')).toBeDefined();
  });
});
