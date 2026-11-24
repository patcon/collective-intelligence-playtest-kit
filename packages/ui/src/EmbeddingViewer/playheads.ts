import { at } from './math.ts';

/** Fraction of the remaining distance a playhead closes each frame outside a layout tween. */
const CHASE_RATE = 0.2;

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

/** Playheads for `trackCount` tracks, all hidden. */
export function createPlayheadEaser(trackCount: number): PlayheadEaser {
  const positions = new Array<number>(trackCount).fill(0);
  const visible = new Array<boolean>(trackCount).fill(false);
  /**
   * Per track: where its playhead was along the path when the current layout
   * tween started, so it eases to its new spot in step with the points (null:
   * not tweening, e.g. after a seek mid-tween).
   */
  let from = new Array<number | null>(trackCount).fill(null);
  /** Last target seen, to spot seeks (NaN right after a new layout, whose growth isn't a seek). */
  let lastTarget = new Array<number>(trackCount).fill(0);

  /** Move track `k`'s playhead toward `target`, a node index on its path. */
  const ease = (k: number, target: number, tweenK: number | null) => {
    // A jump in the target mid-tween is a seek: let it use the quick chase below
    // (NaN compares false, so the new layout's own jump is eased with the points)
    if (from[k] !== null && Math.abs(target - at(lastTarget, k)) > 1) {
      from[k] = null;
    }
    lastTarget[k] = target;
    const start = from[k] ?? null;
    if (!visible[k]) {
      positions[k] = target;
    } else if (tweenK !== null && start !== null) {
      // New layout: ease along the path with the same timing as the points
      positions[k] = start + (target - start) * tweenK;
    } else {
      const t = at(positions, k);
      positions[k] = t + (target - t) * CHASE_RATE;
    }
  };

  return {
    positions,
    visible,
    startLayout() {
      from = positions.slice();
      // The path just grew, possibly by several segments: don't mistake that for a seek
      lastTarget = lastTarget.map(() => Number.NaN);
    },
    step(targets, lengths, tweenK) {
      for (let k = 0; k < trackCount; k++) {
        const hp = targets[k];
        const len = lengths[k] ?? 0;
        if (hp !== null && hp !== undefined && len > 0) {
          ease(k, Math.min(len - 1, Math.max(0, hp)), tweenK);
          visible[k] = true;
        } else {
          visible[k] = false;
        }
      }
    },
  };
}
