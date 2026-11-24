import type { Vector3 } from 'three';
import { Quaternion } from 'three';
import type { FollowMode } from './types.ts';

/** The active track's playhead, as the follow camera sees it. */
export interface FollowTarget {
  position: Vector3;
  /** Direction of the path at the playhead; null when the path has fewer than two nodes. */
  tangent: () => Vector3 | null;
}

/**
 * Steers the camera after the active track's playhead. 'tracking' carries the
 * camera along with it; 'following' also swings round behind it as the path
 * turns. Switching mode or track glides the camera over with the same timing
 * and easing as the layout tween; 'static' leaves it where it is.
 */
export interface FollowController {
  readonly mode: FollowMode;
  /** Where the camera is headed: a glide's destination while one runs, else where it is. For `onCameraChange`. */
  destination(): { position: Vector3; target: Vector3 };
  /** Switch mode, gliding onto `target` (null: no playhead shown) unless the new mode is 'static'. */
  setMode(next: FollowMode, target: FollowTarget | null): void;
  /** Advance to `now` (ms), following `target`, the playhead of track `track` (null: not shown). */
  step(now: number, track: number, target: FollowTarget | null): void;
}

// Fraction of the remaining angle the camera's heading closes each frame.
// Low enough that a sharp turn in the path reads as a swing, not a cut.
const SWING_RATE = 0.04;

const _q = new Quaternion();
const _identity = new Quaternion();

/**
 * Ease the follow camera's heading toward the path's current direction.
 *
 * `heading` is the camera's smoothed sense of "forward" (mutated in place).
 * `offset` (camera position minus target) is rotated by the same partial
 * rotation, so the camera orbits around the target as the heading catches up
 * rather than snapping behind the cursor whenever the path bends.
 */
export function swingFollowCamera(offset: Vector3, heading: Vector3, pathTangent: Vector3) {
  if (heading.lengthSq() === 0) {
    heading.copy(pathTangent);
    return;
  }
  if (heading.dot(pathTangent) > 0.99999) {
    return;
  }
  _q.setFromUnitVectors(heading, pathTangent);
  _identity.identity().slerp(_q, SWING_RATE);
  offset.applyQuaternion(_identity);
  heading.applyQuaternion(_identity).normalize();
}
