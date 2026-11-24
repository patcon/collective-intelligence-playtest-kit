import type { BufferGeometry, Color } from 'three';
import type { ViewerPoint, ViewerTrack } from './types.ts';

/** A shown point and its index in the `points` prop. */
export interface Slot {
  point: ViewerPoint;
  index: number;
}

/**
 * The points' shared buffers and their tween between layouts. Points keep
 * their key across layouts, so a known point moves from where it is (even
 * mid-tween), a new one fades in from the background in place, and one whose
 * key is gone fades out where it is, drawn after the shown ones.
 *
 * Outlives the scene that draws it, so a remount (StrictMode) picks up where
 * the last one left off.
 */
export interface LayoutTween {
  /** Points shown, and hoverable: slots 0..count-1. */
  readonly count: number;
  /** Slots drawn: the shown points plus, mid-tween, the ones fading out after them. */
  readonly drawCount: number;
  /** The point in each shown slot. */
  readonly slots: ReadonlyArray<Slot>;
  /**
   * Per track: slot indices in path order. Mid-tween, a track left with no
   * shown points keeps its fading-out ones, so its path fades with them.
   */
  readonly trackIndices: ReadonlyArray<ReadonlyArray<number>>;
  /** Displayed (possibly mid-tween) xyz per slot. Replaced when the buffers grow. */
  readonly positions: Float32Array;
  /** Displayed rgb per slot, alongside `positions`. */
  readonly colors: Float32Array;
  /**
   * Draw the buffers through `geo` (null: none), keeping its attributes and
   * draw range current as the buffers grow and points settle. The glow shader
   * reads colours as `aColor` and per-point randoms as `aSeed`.
   */
  bind(geo: BufferGeometry | null): void;
  /**
   * Start tweening to `points`. Points whose track is outside `tracks` are
   * dropped. Each track's colours run along its own gradient; `background` is
   * the colour points fade in from and out to.
   */
  retarget(
    points: ReadonlyArray<ViewerPoint>,
    tracks: ReadonlyArray<ViewerTrack>,
    background: Color,
  ): void;
  /** Advance the tween to `now` (ms). Eased progress in [0, 1], or null if no tween is running. */
  step(now: number): number | null;
}
