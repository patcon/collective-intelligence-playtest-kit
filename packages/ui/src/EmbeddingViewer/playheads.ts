/**
 * Where each track's playhead is drawn along its path, as a fractional node
 * index. It eases toward the `playheads` prop: in step with the points while
 * a new layout tweens in, and with a quick chase otherwise (a seek, or the
 * playhead advancing).
 */
export interface PlayheadEaser {
  /** Per track: fractional node index the playhead is drawn at. */
  readonly positions: ReadonlyArray<number>;
  /** Per track: whether the playhead is drawn at all. */
  readonly visible: ReadonlyArray<boolean>;
  /**
   * A new layout started: ease each playhead from where it is now, with the
   * points. The path may have grown by several nodes, which is not a seek.
   */
  startLayout(): void;
  /**
   * Advance one frame. `targets` is the `playheads` prop (null or missing
   * hides that track's), `lengths` the node count of each track's path, and
   * `tweenK` the layout tween's eased progress (null: none running).
   * A playhead that just appeared snaps to its target.
   */
  step(
    targets: ReadonlyArray<number | null>,
    lengths: ReadonlyArray<number>,
    tweenK: number | null,
  ): void;
}
