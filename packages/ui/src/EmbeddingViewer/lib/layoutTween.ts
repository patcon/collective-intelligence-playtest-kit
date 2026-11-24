import type { BufferGeometry, Color } from 'three';
import { BufferAttribute, DynamicDrawUsage } from 'three';
import { at, easeInOutCubic, hash01 } from './math.ts';
import { lutColor, trackLut } from './palettes.ts';
import type { ViewerPoint, ViewerTrack } from '../types.ts';

/** How long a layout change takes to tween in. The follow camera glides with the same timing. */
export const TWEEN_MS = 900;
const INITIAL_CAPACITY = 64;

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

interface Buffers {
  capacity: number;
  /** The arrays behind `position` and `color`. */
  pos: Float32Array;
  col: Float32Array;
  position: BufferAttribute;
  color: BufferAttribute;
  /** Per-point random in [0, 1): glow sprite size and pulse phase. */
  seed: BufferAttribute;
  fromPos: Float32Array;
  toPos: Float32Array;
  fromCol: Float32Array;
  toCol: Float32Array;
}

function makeBuffers(capacity: number): Buffers {
  const pos = new Float32Array(capacity * 3);
  const col = new Float32Array(capacity * 3);
  return {
    capacity,
    pos,
    col,
    position: new BufferAttribute(pos, 3).setUsage(DynamicDrawUsage),
    color: new BufferAttribute(col, 3).setUsage(DynamicDrawUsage),
    seed: new BufferAttribute(
      Float32Array.from({ length: capacity }, (_, i) => hash01(i)),
      1,
    ),
    fromPos: new Float32Array(capacity * 3),
    toPos: new Float32Array(capacity * 3),
    fromCol: new Float32Array(capacity * 3),
    toCol: new Float32Array(capacity * 3),
  };
}

/** Point the geometry at the buffers (the glow shader reads colours as `aColor`). */
function bindBuffers(geo: BufferGeometry, buf: Buffers) {
  geo.setAttribute('position', buf.position);
  geo.setAttribute('color', buf.color);
  geo.setAttribute('aColor', buf.color);
  geo.setAttribute('aSeed', buf.seed);
}

/** The points to show, in order: those whose track is outside the scene's tracks are dropped. */
function toSlots(points: ReadonlyArray<ViewerPoint>, trackCount: number): Array<Slot> {
  const slots: Array<Slot> = [];
  points.forEach((point, index) => {
    if (Number.isInteger(point.track) && point.track >= 0 && point.track < trackCount) {
      slots.push({ point, index });
    }
  });
  return slots;
}

/** Old slots of the points in `prev` whose key isn't in `shown`. */
function exitingSlots(prev: ReadonlyArray<Slot>, shown: ReadonlyArray<Slot>): Array<number> {
  const nextKeys = new Set(shown.map((slot) => slot.point.key));
  const exiting: Array<number> = [];
  prev.forEach((slot, i) => {
    if (!nextKeys.has(slot.point.key)) {
      exiting.push(i);
    }
  });
  return exiting;
}

/** Where each point was when the layout changed, read before slots get reassigned. */
interface Before {
  pos: Float32Array;
  col: Float32Array;
  slotOf: Map<ViewerPoint['key'], number>;
  bg: ReadonlyArray<number>;
}

/**
 * Tween targets for the shown points, in slots 0..n-1. Returns each track's
 * slots in path order.
 */
function writeShown(
  buf: Buffers,
  shown: ReadonlyArray<Slot>,
  before: Before,
  tracks: ReadonlyArray<ViewerTrack>,
  trackCount: number,
): Array<Array<number>> {
  const idx: Array<Array<number>> = Array.from({ length: trackCount }, () => []);
  shown.forEach(({ point }, i) => {
    idx[point.track]?.push(i);
    const o = before.slotOf.get(point.key);
    for (let d = 0; d < 3; d++) {
      buf.toPos[i * 3 + d] = at(point.position, d);
      // Known points move from where they were; new ones fade in from the background in place
      buf.fromPos[i * 3 + d] = o !== undefined ? at(before.pos, o * 3 + d) : at(point.position, d);
      buf.fromCol[i * 3 + d] = o !== undefined ? at(before.col, o * 3 + d) : at(before.bg, d);
    }
  });
  idx.forEach((list, k) => {
    const lut = trackLut(tracks[k], k);
    list.forEach((i, j) => {
      const c = lutColor(lut, list.length > 1 ? j / (list.length - 1) : 0);
      buf.toCol[i * 3] = c.r;
      buf.toCol[i * 3 + 1] = c.g;
      buf.toCol[i * 3 + 2] = c.b;
    });
  });
  return idx;
}

/**
 * Tween targets for the points fading out, in the slots after the `n` shown
 * ones. Returns each track's fading-out slots, so its path can fade with them.
 */
function writeExiting(
  buf: Buffers,
  exiting: ReadonlyArray<number>,
  prev: ReadonlyArray<Slot>,
  n: number,
  before: Before,
  trackCount: number,
): Array<Array<number>> {
  const exitIdx: Array<Array<number>> = Array.from({ length: trackCount }, () => []);
  exiting.forEach((o, j) => {
    const i = n + j;
    exitIdx[prev[o]?.point.track ?? 0]?.push(i);
    for (let d = 0; d < 3; d++) {
      buf.fromPos[i * 3 + d] = buf.toPos[i * 3 + d] = at(before.pos, o * 3 + d);
      buf.fromCol[i * 3 + d] = at(before.col, o * 3 + d);
      buf.toCol[i * 3 + d] = at(before.bg, d);
    }
  });
  return exitIdx;
}

/** A layout tween for `trackCount` tracks, starting with no points. */
export function createLayoutTween(trackCount: number): LayoutTween {
  let buf = makeBuffers(INITIAL_CAPACITY);
  let geo: BufferGeometry | null = null;
  let count = 0;
  let drawCount = 0;
  let slots: ReadonlyArray<Slot> = [];
  let trackIndices: Array<Array<number>> = Array.from({ length: trackCount }, () => []);
  /** `trackIndices` once the fading-out points are gone. */
  let settled: Array<Array<number>> | null = null;
  let tweenStart: number | null = null;

  const ensureCapacity = (total: number) => {
    if (total <= buf.capacity) {
      return;
    }
    let cap = buf.capacity;
    while (cap < total) {
      cap *= 2;
    }
    const grown = makeBuffers(cap);
    grown.pos.set(buf.pos);
    grown.col.set(buf.col);
    buf = grown;
    if (geo) {
      bindBuffers(geo, buf);
    }
  };

  return {
    get count() {
      return count;
    },
    get drawCount() {
      return drawCount;
    },
    get slots() {
      return slots;
    },
    get trackIndices() {
      return trackIndices;
    },
    get positions() {
      return buf.pos;
    },
    get colors() {
      return buf.col;
    },

    bind(next) {
      geo = next;
      if (geo) {
        bindBuffers(geo, buf);
        geo.setDrawRange(0, drawCount);
      }
    },

    retarget(points, tracks, background) {
      const shown = toSlots(points, trackCount);
      const n = shown.length;
      // Shown points whose key is gone fade out where they are, drawn after the new ones
      const exiting = exitingSlots(slots, shown);
      const total = n + exiting.length;
      ensureCapacity(total);

      const before: Before = {
        // Where each point is now (possibly mid-tween)
        pos: buf.pos.slice(0, count * 3),
        col: buf.col.slice(0, count * 3),
        slotOf: new Map(slots.map((slot, i) => [slot.point.key, i])),
        bg: [background.r, background.g, background.b],
      };
      const idx = writeShown(buf, shown, before, tracks, trackCount);
      const exitIdx = writeExiting(buf, exiting, slots, n, before, trackCount);
      buf.pos.set(buf.fromPos.subarray(0, total * 3));
      buf.col.set(buf.fromCol.subarray(0, total * 3));
      buf.position.needsUpdate = true;
      buf.color.needsUpdate = true;

      // Fading-out points keep their track's path (so its line fades with them) until the tween ends
      settled = exiting.length > 0 ? idx : null;
      trackIndices =
        exiting.length > 0
          ? idx.map((list, k) => (list.length > 0 ? list : (exitIdx[k] ?? list)))
          : idx;
      slots = shown;
      count = n;
      drawCount = total;
      geo?.setDrawRange(0, total);
      tweenStart = performance.now();
    },

    step(now) {
      if (tweenStart === null) {
        return null;
      }
      const raw = Math.min(1, Math.max(0, (now - tweenStart) / TWEEN_MS));
      const k = easeInOutCubic(raw);
      for (let j = 0; j < drawCount * 3; j++) {
        buf.pos[j] = at(buf.fromPos, j) + (at(buf.toPos, j) - at(buf.fromPos, j)) * k;
        buf.col[j] = at(buf.fromCol, j) + (at(buf.toCol, j) - at(buf.fromCol, j)) * k;
      }
      buf.position.needsUpdate = true;
      buf.color.needsUpdate = true;
      geo?.computeBoundingSphere();
      if (raw >= 1) {
        tweenStart = null;
        // Drop the faded-out points and their paths
        if (settled) {
          trackIndices = settled;
          settled = null;
          drawCount = count;
          geo?.setDrawRange(0, count);
        }
      }
      return k;
    },
  };
}
