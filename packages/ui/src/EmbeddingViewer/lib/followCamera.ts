import { Quaternion, Vector3 } from 'three';
import { TWEEN_MS } from './layoutTween.ts';
import { easeInOutCubic } from './math.ts';
import type { FollowMode } from '../types.ts';

/** Where 'following' glides to when switched on: this far back along the path from the playhead... */
const FOLLOW_BEHIND = 0.6;
/** ...and this far above it. */
const FOLLOW_ABOVE = 0.15;

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

/**
 * A camera move in progress (switching follow mode or track): the follow
 * logic steers `toPos`/`toTarget`, and the real camera eases from where it
 * was to them with the same timing and easing as the point tween.
 */
interface Glide {
  start: number;
  fromPos: Vector3;
  fromTarget: Vector3;
  toPos: Vector3;
  toTarget: Vector3;
}

/**
 * A follow controller steering `position` (the camera's) and `target` (the
 * orbit controls'), both moved in place. Starts in `mode`, following `track`.
 */
export function createFollowController(
  position: Vector3,
  target: Vector3,
  mode: FollowMode,
  track: number,
): FollowController {
  let current = mode;
  let glide: Glide | null = null;
  let lastFollowed = track;
  const prevFollowTarget = new Vector3();
  const prevPathTangent = new Vector3();

  /** Start easing the camera from where it is now; returns the destination for the follow logic to set. */
  const startGlide = (): Glide => {
    const prev = glide;
    glide = {
      start: performance.now(),
      fromPos: position.clone(),
      fromTarget: target.clone(),
      // Mid-move: carry on toward the same place, from where the camera is now
      toPos: prev ? prev.toPos : position.clone(),
      toTarget: prev ? prev.toTarget : target.clone(),
    };
    return glide;
  };

  /** Steer the logical camera (the real one, or a glide's destination while one runs) after `followed`. */
  const follow = (followed: FollowTarget) => {
    const camPos = glide ? glide.toPos : position;
    const camTarget = glide ? glide.toTarget : target;
    const newTarget = followed.position.clone();
    if (current === 'tracking') {
      camPos.add(newTarget.clone().sub(prevFollowTarget));
    } else if (current === 'following') {
      const tangent = followed.tangent();
      if (!tangent) {
        return;
      }
      const offset = camPos.clone().sub(prevFollowTarget);
      swingFollowCamera(offset, prevPathTangent, tangent);
      camPos.copy(newTarget).add(offset);
    } else {
      return;
    }
    camTarget.copy(newTarget);
    prevFollowTarget.copy(newTarget);
  };

  const advanceGlide = (now: number) => {
    if (!glide) {
      return;
    }
    const raw = Math.min(1, (now - glide.start) / TWEEN_MS);
    const k = easeInOutCubic(raw);
    position.lerpVectors(glide.fromPos, glide.toPos, k);
    target.lerpVectors(glide.fromTarget, glide.toTarget, k);
    if (raw >= 1) {
      glide = null;
    }
  };

  return {
    get mode() {
      return current;
    },
    destination() {
      return glide
        ? { position: glide.toPos, target: glide.toTarget }
        : { position, target };
    },
    setMode(next, followed) {
      current = next;
      if (!followed) {
        return;
      }
      // Static leaves the camera where it is; the others glide onto the playhead
      const move = next === 'static' ? glide : startGlide();
      const cursorPos = followed.position.clone();
      const tangent = next === 'following' && move ? followed.tangent() : null;
      if (move && tangent) {
        move.toPos
          .copy(cursorPos)
          .addScaledVector(tangent, -FOLLOW_BEHIND)
          .add(new Vector3(0, FOLLOW_ABOVE, 0));
        move.toTarget.copy(cursorPos);
        prevPathTangent.copy(tangent);
      }
      prevFollowTarget.copy(cursorPos);
    },
    step(now, active, followed) {
      if (active !== lastFollowed && followed) {
        // Glide over to the new track's playhead, keeping the same view of it
        const move = current !== 'static' ? startGlide() : null;
        prevFollowTarget.copy(move ? move.toTarget : followed.position);
        prevPathTangent.set(0, 0, 0);
        lastFollowed = active;
      }
      if (followed) {
        follow(followed);
      }
      advanceGlide(now);
    },
  };
}
