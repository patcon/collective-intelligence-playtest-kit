import type { MouseEvent as ReactMouseEvent, RefObject } from 'react';
import { useMemo, useRef, useState } from 'react';
import type { Color } from 'three';
import {
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  GridHelper,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Raycaster,
  Scene,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import useLatestRef from '../hooks/effects/useLatestRef.ts';
import useOnChange from '../hooks/effects/useOnChange.ts';
import useThreeScene from '../hooks/effects/useThreeScene.ts';
import { swingFollowCamera } from './followCamera.ts';
import { addTubeLights, at, createGlowFx, createPathVisual, hash01 } from './livePathVisuals.ts';
import type { GlowFx, LiveRenderer, PathVisual } from './livePathVisuals.ts';
import { SCENE_BG, lutColor, trackLut } from './palettes.ts';
import type { CameraState, EmbeddingViewerProps, FollowMode, ViewerPoint } from './types.ts';

type SceneProps = Omit<EmbeddingViewerProps, 'initialCamera' | 'pathStyle'> & {
  /** Read once when the scene is built. */
  pathStyle: LiveRenderer;
  /** The camera to start from, read when the scene is built. */
  cameraRef: RefObject<CameraState | undefined>;
  followMode: FollowMode;
  onFollowModeChange: (mode: FollowMode) => void;
};

const DEFAULT_LINE_WIDTH = 3;
const DEFAULT_NODE_SIZE = 0.04;
const NO_PLAYHEADS: ReadonlyArray<number | null> = [];

const TWEEN_MS = 900;
const GRID_SIZE = 6;
const GRID_DIVISIONS = 24;
const GRID_Y = -1.2;
const ACTIVE_LINE_OPACITY = 0.75;
const INACTIVE_LINE_OPACITY = 0.35;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const NEXT_FOLLOW_MODE: Readonly<Record<FollowMode, FollowMode>> = {
  static: 'tracking',
  tracking: 'following',
  following: 'static',
};

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

/** A shown point and its index in the `points` prop. */
interface Slot {
  point: ViewerPoint;
  index: number;
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

/**
 * Several tracks sharing one embedding space (v9). Points tween in place when
 * the layout changes, and each track gets its own coloured path (line, tube or
 * glow) and playhead.
 */
export default function EmbeddingViewer({
  initialCamera,
  onCameraChange,
  pathStyle = 'original',
  ...props
}: EmbeddingViewerProps) {
  // The scene is built for one track count and path style. Rebuilding it for
  // another keeps the follow mode and starts from the last reported camera.
  const [followMode, setFollowMode] = useState<FollowMode>(initialCamera?.followMode ?? 'static');
  const cameraRef = useRef(initialCamera);
  const rememberCamera = (state: CameraState) => {
    cameraRef.current = state;
    onCameraChange?.(state);
  };
  return (
    <EmbeddingScene
      key={`${props.tracks.length}:${pathStyle}`}
      {...props}
      pathStyle={pathStyle}
      cameraRef={cameraRef}
      onCameraChange={rememberCamera}
      followMode={followMode}
      onFollowModeChange={setFollowMode}
    />
  );
}

function EmbeddingScene({
  points,
  tracks,
  playheads = NO_PLAYHEADS,
  activeTrack = 0,
  onPointClick,
  cameraRef,
  onCameraChange,
  followMode,
  onFollowModeChange,
  lineWidth = DEFAULT_LINE_WIDTH,
  nodeSize = DEFAULT_NODE_SIZE,
  autoRotate = false,
  autoRotateSpeed = 1,
  showGrid = true,
  pathStyle,
  glowStrength = 1,
}: SceneProps) {
  const trackCount = tracks.length;
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    camera: PerspectiveCamera;
    controls: OrbitControls;
    pointsMesh: Points;
    pointsMat: PointsMaterial;
    paths: Array<PathVisual>;
    glow: GlowFx | null;
    spheres: Array<Mesh>;
    grid: GridHelper;
    raycaster: Raycaster;
    bgColor: Color;
  } | null>(null);
  const buffersRef = useRef<Buffers>(makeBuffers(64));
  /** Points currently shown (slots 0..count-1 of the buffers). */
  const countRef = useRef(0);
  /** Slots drawn: the shown points plus, during a tween, the ones fading out after them. */
  const drawCountRef = useRef(0);
  /** The point in each shown slot. */
  const slotsRef = useRef<ReadonlyArray<Slot>>([]);
  /** Per track: indices into the shared buffers, in path order. */
  const trackIdxRef = useRef<Array<Array<number>>>(Array.from({ length: trackCount }, () => []));
  /** `trackIdxRef` once the fading-out points are gone. */
  const settledTrackIdxRef = useRef<Array<Array<number>> | null>(null);
  const tweenStartRef = useRef<number | null>(null);
  const pendingPointsRef = useRef<ReadonlyArray<ViewerPoint> | null>(points);
  const tracksRef = useLatestRef(tracks);

  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
    track: number;
  } | null>(null);
  const followModeRef = useRef<FollowMode>(followMode);
  const prevFollowTargetRef = useRef(new Vector3());
  /**
   * Camera move in progress (switching follow mode or track): the follow
   * logic steers `toPos`/`toTarget`, and the real camera eases from where it
   * was to them with the same timing and easing as the point tween.
   */
  const camTweenRef = useRef<{
    start: number;
    fromPos: Vector3;
    fromTarget: Vector3;
    toPos: Vector3;
    toTarget: Vector3;
  } | null>(null);
  const prevPathTangentRef = useRef(new Vector3());
  const playheadsRef = useLatestRef(playheads);
  const activeTrackRef = useRef(activeTrack);
  const sphereTRef = useRef<Array<number>>(new Array<number>(trackCount).fill(0));
  /**
   * Per track: where its playhead was along the path when the current layout
   * tween started, so it eases to its new spot in step with the points (null:
   * not tweening, e.g. after a seek mid-tween). Last target seen, to spot seeks
   * (NaN right after a new layout, whose growth isn't a seek).
   */
  const sphereFromTRef = useRef<Array<number | null>>(
    new Array<number | null>(trackCount).fill(null),
  );
  const sphereLastTargetRef = useRef<Array<number>>(new Array<number>(trackCount).fill(0));
  const style = useMemo(
    () => ({ lineWidth, nodeSize, autoRotate, autoRotateSpeed, showGrid }),
    [lineWidth, nodeSize, autoRotate, autoRotateSpeed, showGrid],
  );
  const styleRef = useRef(style);
  const glowStrengthRef = useLatestRef(glowStrength);
  const onCameraChangeRef = useLatestRef(onCameraChange);

  const pointAt = (i: number, out: Vector3) => {
    const arr = buffersRef.current.pos;
    return out.set(at(arr, i * 3), at(arr, i * 3 + 1), at(arr, i * 3 + 2));
  };

  const pathAt = (track: number, t: number, out: Vector3) => {
    const idx = trackIdxRef.current[track] ?? [];
    const n = idx.length;
    const ct = Math.max(0, Math.min(n - 1, t));
    // Ride the tube's curve when there is one, so the playhead stays inside it
    if (n >= 2 && sceneRef.current?.paths[track]?.pointAt(ct, out)) {
      return out;
    }
    const a = Math.floor(ct),
      b = Math.min(n - 1, a + 1);
    const pa = pointAt(at(idx, a), new Vector3());
    const pb = pointAt(at(idx, b), new Vector3());
    return out.copy(pa).lerp(pb, ct - a);
  };

  const pathTangentAt = (track: number, t: number) => {
    const idx = trackIdxRef.current[track] ?? [];
    const a = Math.max(0, Math.min(idx.length - 2, Math.floor(t)));
    return pointAt(at(idx, a + 1), new Vector3())
      .sub(pointAt(at(idx, a), new Vector3()))
      .normalize();
  };

  /** Rebuild each track's path from the shared (possibly mid-tween) buffers. */
  const syncLines = () => {
    const s = sceneRef.current;
    if (!s) {
      return;
    }
    const b = buffersRef.current;
    const pos = b.pos;
    const col = b.col;
    s.paths.forEach((path, k) => {
      const idx = trackIdxRef.current[k] ?? [];
      const p = new Float32Array(idx.length * 3);
      const c = new Float32Array(idx.length * 3);
      idx.forEach((gi, j) => {
        for (let d = 0; d < 3; d++) {
          p[j * 3 + d] = at(pos, gi * 3 + d);
          c[j * 3 + d] = at(col, gi * 3 + d);
        }
      });
      path.update(p, c, idx.length);
    });
  };

  /** Start easing the camera from where it is now; returns the destination for the follow logic to set. */
  const startCameraTween = () => {
    const s = sceneRef.current;
    if (!s) {
      return null;
    }
    const prev = camTweenRef.current;
    camTweenRef.current = {
      start: performance.now(),
      fromPos: s.camera.position.clone(),
      fromTarget: s.controls.target.clone(),
      // Mid-move: carry on toward the same place, from where the camera is now
      toPos: prev ? prev.toPos : s.camera.position.clone(),
      toTarget: prev ? prev.toTarget : s.controls.target.clone(),
    };
    return camTweenRef.current;
  };

  const applyActiveStyle = () => {
    const s = sceneRef.current;
    if (!s) {
      return;
    }
    const active = activeTrackRef.current;
    const nodeScale = Math.max(1, styleRef.current.nodeSize / DEFAULT_NODE_SIZE);
    s.paths.forEach((path, k) =>
      path.setEmphasis({
        lineOpacity: k === active ? ACTIVE_LINE_OPACITY : INACTIVE_LINE_OPACITY,
        dimmed: k !== active,
        renderOrder: k === active ? 1 : 0,
      }),
    );
    s.spheres.forEach((m, k) => m.scale.setScalar(nodeScale * (k === active ? 1.25 : 0.85)));
  };

  const retarget = (next: ReadonlyArray<ViewerPoint>) => {
    const s = sceneRef.current;
    if (!s) {
      pendingPointsRef.current = next;
      return;
    }
    const shown = toSlots(next, trackCount);
    const n = shown.length;

    // Shown points whose key is gone fade out where they are, drawn after the new ones
    const prevN = countRef.current;
    const prev = slotsRef.current;
    const nextKeys = new Set(shown.map((slot) => slot.point.key));
    // Their old slots
    const exiting: Array<number> = [];
    prev.forEach((slot, i) => {
      if (!nextKeys.has(slot.point.key)) {
        exiting.push(i);
      }
    });
    const total = n + exiting.length;

    let buf = buffersRef.current;
    if (total > buf.capacity) {
      let cap = buf.capacity;
      while (cap < total) {
        cap *= 2;
      }
      const grown = makeBuffers(cap);
      grown.pos.set(buf.pos);
      grown.col.set(buf.col);
      bindBuffers(s.pointsMesh.geometry, grown);
      buffersRef.current = buf = grown;
    }
    const pos = buf.pos;
    const col = buf.col;
    // Where each point is now (possibly mid-tween), before slots get reassigned
    const oldPos = pos.slice(0, prevN * 3);
    const oldCol = col.slice(0, prevN * 3);
    const oldSlot = new Map<ViewerPoint['key'], number>();
    prev.forEach((slot, i) => {
      oldSlot.set(slot.point.key, i);
    });

    const idx: Array<Array<number>> = Array.from({ length: trackCount }, () => []);
    const bg = s.bgColor;
    const bgRgb = [bg.r, bg.g, bg.b];
    shown.forEach(({ point }, i) => {
      idx[point.track]?.push(i);
      const o = oldSlot.get(point.key);
      for (let d = 0; d < 3; d++) {
        buf.toPos[i * 3 + d] = at(point.position, d);
        // Known points move from where they were; new ones fade in from the background in place
        buf.fromPos[i * 3 + d] = o !== undefined ? at(oldPos, o * 3 + d) : at(point.position, d);
        buf.fromCol[i * 3 + d] = o !== undefined ? at(oldCol, o * 3 + d) : at(bgRgb, d);
      }
    });
    idx.forEach((list, k) => {
      const lut = trackLut(tracksRef.current[k], k);
      list.forEach((i, j) => {
        const c = lutColor(lut, list.length > 1 ? j / (list.length - 1) : 0);
        buf.toCol[i * 3] = c.r;
        buf.toCol[i * 3 + 1] = c.g;
        buf.toCol[i * 3 + 2] = c.b;
      });
    });

    // Fading-out points keep their track's path (so its line fades with them) until the tween ends
    const exitIdx: Array<Array<number>> = Array.from({ length: trackCount }, () => []);
    exiting.forEach((o, j) => {
      const i = n + j;
      exitIdx[prev[o]?.point.track ?? 0]?.push(i);
      for (let d = 0; d < 3; d++) {
        buf.fromPos[i * 3 + d] = buf.toPos[i * 3 + d] = at(oldPos, o * 3 + d);
        buf.fromCol[i * 3 + d] = at(oldCol, o * 3 + d);
        buf.toCol[i * 3 + d] = at(bgRgb, d);
      }
    });
    pos.set(buf.fromPos.subarray(0, total * 3));
    col.set(buf.fromCol.subarray(0, total * 3));
    buf.position.needsUpdate = true;
    buf.color.needsUpdate = true;

    settledTrackIdxRef.current = exiting.length > 0 ? idx : null;
    trackIdxRef.current =
      exiting.length > 0
        ? idx.map((list, k) => (list.length > 0 ? list : (exitIdx[k] ?? list)))
        : idx;
    slotsRef.current = shown;
    countRef.current = n;
    drawCountRef.current = total;
    s.pointsMesh.geometry.setDrawRange(0, total);
    syncLines();
    sphereFromTRef.current = sphereTRef.current.slice();
    // The path just grew, possibly by several segments: don't mistake that for a seek
    sphereLastTargetRef.current = sphereLastTargetRef.current.map(() => Number.NaN);
    tweenStartRef.current = performance.now();
  };

  useThreeScene(mountRef, (mount) => {
    const w = mount.clientWidth;
    const h = mount.clientHeight;
    const initialCamera = cameraRef.current;

    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    const bgColor = SCENE_BG;
    renderer.setClearColor(bgColor);
    mount.append(renderer.domElement);

    const scene = new Scene();
    const camera = new PerspectiveCamera(60, w / h, 0.01, 100);
    camera.position.set(0, 0, 3);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = styleRef.current.autoRotate;
    controls.autoRotateSpeed = styleRef.current.autoRotateSpeed;
    if (initialCamera) {
      camera.position.set(...initialCamera.position);
      controls.target.set(...initialCamera.target);
    }
    const onControlsChange = () => {
      // Mid-move, remember where the camera is headed (a remount picks up from there)
      const pos = camTweenRef.current?.toPos ?? camera.position;
      const target = camTweenRef.current?.toTarget ?? controls.target;
      onCameraChangeRef.current?.({
        position: [pos.x, pos.y, pos.z],
        target: [target.x, target.y, target.z],
        followMode: followModeRef.current,
      });
    };
    controls.addEventListener('change', onControlsChange);

    const glow =
      pathStyle === 'glow'
        ? createGlowFx(
            renderer,
            scene,
            camera,
            w,
            h,
            styleRef.current.nodeSize,
            styleRef.current.lineWidth,
          )
        : null;
    if (pathStyle === 'cividis-tube') {
      addTubeLights(scene);
    }

    const pointsGeo = new BufferGeometry();
    bindBuffers(pointsGeo, buffersRef.current);
    pointsGeo.setDrawRange(0, 0);
    const pointsMat = new PointsMaterial({
      size: styleRef.current.nodeSize,
      sizeAttenuation: true,
      vertexColors: true,
    });
    const pointsMesh = new Points(pointsGeo, glow ? glow.nodeMaterial : pointsMat);
    pointsMesh.frustumCulled = false;
    // The tube's alternating shading marks the nodes; keep the (hidden) points for hover/click
    pointsMesh.visible = pathStyle !== 'cividis-tube';
    scene.add(pointsMesh);

    const paths = Array.from({ length: trackCount }, () =>
      createPathVisual(pathStyle, scene, styleRef.current.lineWidth, glow),
    );

    // Playheads: red like the single-session view (the active one is drawn larger, see applyActiveStyle)
    const spheres = Array.from({ length: trackCount }, () => {
      const m = new Mesh(
        new SphereGeometry(0.04, 16, 16),
        new MeshBasicMaterial({ color: 0xff_22_22 }),
      );
      m.visible = false;
      scene.add(m);
      return m;
    });

    const grid = new GridHelper(GRID_SIZE, GRID_DIVISIONS, 0x8a_8a_8a, 0x4a_4a_4a);
    grid.position.y = GRID_Y;
    const gridMat = grid.material;
    gridMat.transparent = true;
    gridMat.depthWrite = false;
    grid.visible = styleRef.current.showGrid;
    scene.add(grid);

    const raycaster = new Raycaster();
    raycaster.params.Points.threshold = 0.05;

    sceneRef.current = {
      camera,
      controls,
      pointsMesh,
      pointsMat,
      paths,
      glow,
      spheres,
      grid,
      raycaster,
      bgColor,
    };
    applyActiveStyle();
    if (pendingPointsRef.current) {
      retarget(pendingPointsRef.current);
      pendingPointsRef.current = null;
    } else {
      // Rebuilt scene (StrictMode remount)
      pointsGeo.setDrawRange(0, drawCountRef.current);
      syncLines();
    }

    let animId = 0;
    const sphereWasVisible = new Array<boolean>(trackCount).fill(false);
    let lastFollowed = activeTrackRef.current;
    let lastFrame = performance.now();
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;
      const n = drawCountRef.current;
      // Layout tween progress (null: none running); playheads use it too
      let tweenK: number | null = null;

      if (tweenStartRef.current !== null) {
        const b = buffersRef.current;
        const raw = Math.min(1, (performance.now() - tweenStartRef.current) / TWEEN_MS);
        const k = easeInOutCubic(raw);
        tweenK = k;
        const pos = b.pos;
        const col = b.col;
        for (let j = 0; j < n * 3; j++) {
          pos[j] = at(b.fromPos, j) + (at(b.toPos, j) - at(b.fromPos, j)) * k;
          col[j] = at(b.fromCol, j) + (at(b.toCol, j) - at(b.fromCol, j)) * k;
        }
        b.position.needsUpdate = true;
        b.color.needsUpdate = true;
        pointsGeo.computeBoundingSphere();
        if (raw >= 1) {
          tweenStartRef.current = null;
          // Drop the faded-out points and their paths
          if (settledTrackIdxRef.current) {
            trackIdxRef.current = settledTrackIdxRef.current;
            settledTrackIdxRef.current = null;
            drawCountRef.current = countRef.current;
            pointsGeo.setDrawRange(0, countRef.current);
          }
        }
        syncLines();
      }

      spheres.forEach((sphere, k) => {
        const hp = playheadsRef.current[k];
        const len = trackIdxRef.current[k]?.length ?? 0;
        if (hp !== null && hp !== undefined && len > 0) {
          const target = Math.min(len - 1, Math.max(0, hp));
          let from = sphereFromTRef.current[k] ?? null;
          // A jump in the target mid-tween is a seek: let it use the quick chase below
          // (NaN compares false, so the new layout's own jump is eased with the points)
          if (from !== null && Math.abs(target - at(sphereLastTargetRef.current, k)) > 1) {
            sphereFromTRef.current[k] = null;
            from = null;
          }
          sphereLastTargetRef.current[k] = target;
          if (!sphereWasVisible[k]) {
            sphereTRef.current[k] = target;
          } else if (tweenK !== null && from !== null) {
            // New layout: ease along the path with the same timing as the points
            sphereTRef.current[k] = from + (target - from) * tweenK;
          } else {
            const t = at(sphereTRef.current, k);
            sphereTRef.current[k] = t + (target - t) * 0.2;
          }
          pathAt(k, at(sphereTRef.current, k), sphere.position);
          sphere.visible = true;
          sphereWasVisible[k] = true;
        } else {
          sphere.visible = false;
          sphereWasVisible[k] = false;
        }
      });

      // Follow the active track's playhead. The follow logic steers a logical
      // camera: the real one, or a camera move's destination while one runs.
      const active = activeTrackRef.current;
      const followed = spheres[active];
      const mode = followModeRef.current;
      if (active !== lastFollowed && followed?.visible) {
        // Glide over to the new track's playhead, keeping the same view of it
        const tween = mode !== 'static' ? startCameraTween() : null;
        prevFollowTargetRef.current.copy(tween ? tween.toTarget : followed.position);
        prevPathTangentRef.current.set(0, 0, 0);
        lastFollowed = active;
      }
      const camTween = camTweenRef.current;
      const camPos = camTween ? camTween.toPos : camera.position;
      const camTarget = camTween ? camTween.toTarget : controls.target;
      if (mode === 'tracking' && followed?.visible) {
        const newTarget = followed.position.clone();
        camPos.add(newTarget.clone().sub(prevFollowTargetRef.current));
        camTarget.copy(newTarget);
        prevFollowTargetRef.current.copy(newTarget);
      } else if (
        mode === 'following' &&
        followed?.visible &&
        (trackIdxRef.current[active]?.length ?? 0) > 1
      ) {
        const newTarget = followed.position.clone();
        const offset = camPos.clone().sub(prevFollowTargetRef.current);
        swingFollowCamera(
          offset,
          prevPathTangentRef.current,
          pathTangentAt(active, at(sphereTRef.current, active)),
        );
        camPos.copy(newTarget).add(offset);
        camTarget.copy(newTarget);
        prevFollowTargetRef.current.copy(newTarget);
      }
      if (camTween) {
        const raw = Math.min(1, (now - camTween.start) / TWEEN_MS);
        const k = easeInOutCubic(raw);
        camera.position.lerpVectors(camTween.fromPos, camTween.toPos, k);
        controls.target.lerpVectors(camTween.fromTarget, camTween.toTarget, k);
        if (raw >= 1) {
          camTweenRef.current = null;
        }
      }
      controls.update(dt);
      if (glow) {
        glow.render(dt, camera.position.distanceTo(controls.target), n, glowStrengthRef.current);
      } else {
        renderer.render(scene, camera);
      }
    };
    animate();

    const ro = new ResizeObserver(() => {
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      if (nw === 0 || nh === 0) {
        return;
      }
      renderer.setSize(nw, nh);
      glow?.setSize(nw, nh);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(animId);
      controls.removeEventListener('change', onControlsChange);
      controls.dispose();
      paths.forEach((p) => p.dispose());
      glow?.dispose();
      pointsGeo.dispose();
      pointsMat.dispose();
      renderer.dispose();
      ro.disconnect();
      sceneRef.current = null;
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  });

  useOnChange(points, retarget);
  useOnChange(activeTrack, (value) => {
    activeTrackRef.current = value;
    applyActiveStyle();
  });
  useOnChange(style, (value) => {
    styleRef.current = value;
    const s = sceneRef.current;
    if (!s) {
      return;
    }
    s.paths.forEach((p) => p.setLineWidth(value.lineWidth));
    s.glow?.setLineWidth(value.lineWidth);
    s.glow?.setNodeSize(value.nodeSize);
    s.pointsMat.size = value.nodeSize;
    s.controls.autoRotate = value.autoRotate;
    s.controls.autoRotateSpeed = value.autoRotateSpeed;
    s.grid.visible = value.showGrid;
    applyActiveStyle();
  });

  const hitTest = (e: ReactMouseEvent<HTMLDivElement>) => {
    const s = sceneRef.current;
    if (!s || countRef.current === 0) {
      return null;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const mouse = new Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    s.raycaster.setFromCamera(mouse, s.camera);
    // Slots past the shown points are fading out: not hoverable
    const index = s.raycaster
      .intersectObject(s.pointsMesh)
      .find((h) => h.index !== undefined && h.index < countRef.current)?.index;
    const slot = index === undefined ? undefined : slotsRef.current[index];
    return slot ? { slot, x: e.clientX - rect.left, y: e.clientY - rect.top } : null;
  };

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const hit = hitTest(e);
    setTooltip(
      hit
        ? {
            x: hit.x,
            y: hit.y,
            text: hit.slot.point.label ?? '',
            track: hit.slot.point.track,
          }
        : null,
    );
  };

  const mouseDownRef = useRef<{ x: number; y: number } | null>(null);
  const handleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    const down = mouseDownRef.current;
    if (!down) {
      return;
    }
    const dx = e.clientX - down.x,
      dy = e.clientY - down.y;
    if (dx * dx + dy * dy > 25) {
      return;
    }
    const hit = hitTest(e);
    if (hit) {
      onPointClick?.(hit.slot.point, hit.slot.index);
    }
  };

  const followBtnClass = [
    'absolute bottom-2 left-2 text-[11px] py-[3px] px-2 cursor-pointer z-10 pointer-events-auto select-none transition-[background,color,border-color] duration-150 rounded border hover:bg-black/75 hover:text-white',
    followMode === 'tracking'
      ? 'bg-[rgba(40,100,200,0.35)] border-[rgba(80,140,255,0.6)] text-white'
      : followMode === 'following'
        ? 'bg-[rgba(200,50,50,0.35)] border-[rgba(255,80,80,0.6)] text-white'
        : 'bg-black/55 text-white/65 border-white/[0.18]',
  ].join(' ');

  return (
    <div
      className="relative w-full h-full min-h-0 cursor-crosshair [&_canvas]:block [&_canvas]:!w-full [&_canvas]:!h-full"
      ref={mountRef}
      onMouseMove={handleMouseMove}
      onMouseDown={(e) => {
        mouseDownRef.current = { x: e.clientX, y: e.clientY };
      }}
      onClick={handleClick}
    >
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-black/80 text-white text-xs py-[5px] px-2 rounded max-w-[240px] whitespace-pre-wrap z-10 leading-[1.4]"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          <span
            className="font-semibold"
            style={{
              color: `#${lutColor(trackLut(tracks[tooltip.track], tooltip.track), 0.5).getHexString()}`,
            }}
          >
            {tracks[tooltip.track]?.label}
          </span>
          {'\n'}
          {tooltip.text}
        </div>
      )}
      <button
        type="button"
        className={followBtnClass}
        onClick={(e) => {
          e.stopPropagation();
          const next = NEXT_FOLLOW_MODE[followMode];
          onFollowModeChange(next);
          followModeRef.current = next;
          const s = sceneRef.current;
          const active = activeTrackRef.current;
          const sphere = s?.spheres[active];
          // Static leaves the camera where it is; the others glide onto the playhead
          const tween =
            next !== 'static' && sphere?.visible ? startCameraTween() : camTweenRef.current;
          if (s && sphere?.visible) {
            const cursorPos = sphere.position.clone();
            if (next === 'following' && tween && (trackIdxRef.current[active]?.length ?? 0) > 1) {
              const tangent = pathTangentAt(active, at(sphereTRef.current, active));
              tween.toPos
                .copy(cursorPos)
                .addScaledVector(tangent, -0.6)
                .add(new Vector3(0, 0.15, 0));
              tween.toTarget.copy(cursorPos);
              prevPathTangentRef.current.copy(tangent);
            }
            prevFollowTargetRef.current.copy(cursorPos);
          }
          if (s) {
            // Report where the camera is headed, not where it is mid-move
            const pos = tween ? tween.toPos : s.camera.position;
            const target = tween ? tween.toTarget : s.controls.target;
            onCameraChange?.({
              position: [pos.x, pos.y, pos.z],
              target: [target.x, target.y, target.z],
              followMode: next,
            });
          }
        }}
      >
        {followMode === 'static'
          ? '◎ Static'
          : followMode === 'tracking'
            ? '◉ Tracking'
            : '⬤ Following'}
      </button>
    </div>
  );
}
