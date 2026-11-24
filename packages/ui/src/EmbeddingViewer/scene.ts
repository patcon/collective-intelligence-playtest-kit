import type { Vector2 } from 'three';
import {
  BufferGeometry,
  GridHelper,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Raycaster,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createFollowController } from './followCamera.ts';
import type { FollowController, FollowTarget } from './followCamera.ts';
import type { LayoutTween, Slot } from './layoutTween.ts';
import { addTubeLights, createGlowFx, createPathVisual } from './livePathVisuals.ts';
import type { LiveRenderer, PathVisual } from './livePathVisuals.ts';
import { at } from './math.ts';
import { SCENE_BG } from './palettes.ts';
import type { PlayheadEaser } from './playheads.ts';
import type { CameraState, FollowMode, ViewerPoint, ViewerTrack } from './types.ts';

export const DEFAULT_NODE_SIZE = 0.04;

const GRID_SIZE = 6;
const GRID_DIVISIONS = 24;
const GRID_Y = -1.2;
const ACTIVE_LINE_OPACITY = 0.75;
const INACTIVE_LINE_OPACITY = 0.35;
// Unselected tracks' playheads dim like their paths
const INACTIVE_PLAYHEAD_OPACITY = 0.35;

/** Props the scene applies in place, without a rebuild. */
export interface SceneStyle {
  lineWidth: number;
  nodeSize: number;
  autoRotate: boolean;
  autoRotateSpeed: number;
  showGrid: boolean;
}

/** Props the render loop reads every frame. */
export interface FrameInputs {
  playheads: ReadonlyArray<number | null>;
  glowStrength: number;
}

/** Read once, when the scene is built. */
export interface SceneOptions {
  pathStyle: LiveRenderer;
  trackCount: number;
  style: SceneStyle;
  activeTrack: number;
  followMode: FollowMode;
  /** The camera to start from. */
  camera: CameraState | undefined;
  /** Points to tween to once built; null keeps the layout's current ones (a remount). */
  points: ReadonlyArray<ViewerPoint> | null;
  tracks: ReadonlyArray<ViewerTrack>;
  /** Outlive the scene; it draws them and advances them each frame. */
  layout: LayoutTween;
  playheads: PlayheadEaser;
  inputs: () => FrameInputs;
  /** Reports where the camera is headed, not where it is mid-glide. */
  onCameraChange: (state: CameraState) => void;
}

/**
 * The three.js scene in a mounted element: renderer, orbit controls, points,
 * one path and playhead per track, grid, and the render loop. Rebuilt for a
 * new track count or path style.
 */
export interface SceneHandle {
  /** Tween to a new layout. Each track's colours come from `tracks`. */
  setPoints(points: ReadonlyArray<ViewerPoint>, tracks: ReadonlyArray<ViewerTrack>): void;
  setStyle(style: SceneStyle): void;
  setActiveTrack(track: number): void;
  /** Switch follow mode, gliding onto the active track's playhead unless 'static'. */
  setFollowMode(mode: FollowMode): void;
  /** Where the camera is headed, and the follow mode, as `onCameraChange` reports it. */
  cameraState(): CameraState;
  /** The shown point under `ndc` (normalised device coordinates), if any. Fading-out points aren't hit. */
  hitTest(ndc: Vector2): Slot | null;
  dispose(): void;
}

type Playhead = Mesh<SphereGeometry, MeshBasicMaterial>;

function cameraState(follow: FollowController): CameraState {
  const { position, target } = follow.destination();
  return {
    position: [position.x, position.y, position.z],
    target: [target.x, target.y, target.z],
    followMode: follow.mode,
  };
}

/** Displayed position of slot `i`. */
function pointAt(layout: LayoutTween, i: number, out: Vector3): Vector3 {
  const arr = layout.positions;
  return out.set(at(arr, i * 3), at(arr, i * 3 + 1), at(arr, i * 3 + 2));
}

/** Point at fractional node index `t` along a track's path, riding `path`'s curve if it draws one. */
function pathAt(
  layout: LayoutTween,
  path: PathVisual | undefined,
  track: number,
  t: number,
  out: Vector3,
): Vector3 {
  const idx = layout.trackIndices[track] ?? [];
  const n = idx.length;
  const ct = Math.max(0, Math.min(n - 1, t));
  // Ride the tube's curve when there is one, so the playhead stays inside it
  if (n >= 2 && path?.pointAt(ct, out)) {
    return out;
  }
  const a = Math.floor(ct),
    b = Math.min(n - 1, a + 1);
  const pa = pointAt(layout, at(idx, a), new Vector3());
  const pb = pointAt(layout, at(idx, b), new Vector3());
  return out.copy(pa).lerp(pb, ct - a);
}

/** Direction of the node-to-node segment a track's path is on at fractional node index `t`. */
function pathTangentAt(layout: LayoutTween, track: number, t: number): Vector3 {
  const idx = layout.trackIndices[track] ?? [];
  const a = Math.max(0, Math.min(idx.length - 2, Math.floor(t)));
  return pointAt(layout, at(idx, a + 1), new Vector3())
    .sub(pointAt(layout, at(idx, a), new Vector3()))
    .normalize();
}

/** Rebuild each track's path from the shared (possibly mid-tween) buffers. */
function syncPaths(layout: LayoutTween, paths: ReadonlyArray<PathVisual>) {
  const pos = layout.positions;
  const col = layout.colors;
  paths.forEach((path, k) => {
    const idx = layout.trackIndices[k] ?? [];
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
}

function createCamera(
  renderer: WebGLRenderer,
  aspect: number,
  style: SceneStyle,
  initial: CameraState | undefined,
) {
  const camera = new PerspectiveCamera(60, aspect, 0.01, 100);
  camera.position.set(0, 0, 3);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = style.autoRotate;
  controls.autoRotateSpeed = style.autoRotateSpeed;
  if (initial) {
    camera.position.set(...initial.position);
    controls.target.set(...initial.target);
  }
  return { camera, controls };
}

/** Playheads: red like the single-session view (the active one is drawn larger, see `emphasise`). */
function createPlayheads(scene: Scene, trackCount: number): Array<Playhead> {
  return Array.from({ length: trackCount }, () => {
    const m = new Mesh(new SphereGeometry(0.04, 16, 16), new MeshBasicMaterial({ color: 0xff_22_22 }));
    m.visible = false;
    scene.add(m);
    return m;
  });
}

function createGrid(scene: Scene, visible: boolean): GridHelper {
  const grid = new GridHelper(GRID_SIZE, GRID_DIVISIONS, 0x8a_8a_8a, 0x4a_4a_4a);
  grid.position.y = GRID_Y;
  const gridMat = grid.material;
  gridMat.transparent = true;
  gridMat.depthWrite = false;
  grid.visible = visible;
  scene.add(grid);
  return grid;
}

/** Draw the active track's path and playhead on top, and dim the others. */
function emphasise(
  paths: ReadonlyArray<PathVisual>,
  spheres: ReadonlyArray<Playhead>,
  active: number,
  nodeSize: number,
) {
  const nodeScale = Math.max(1, nodeSize / DEFAULT_NODE_SIZE);
  paths.forEach((path, k) =>
    path.setEmphasis({
      lineOpacity: k === active ? ACTIVE_LINE_OPACITY : INACTIVE_LINE_OPACITY,
      dimmed: k !== active,
      renderOrder: k === active ? 1 : 0,
    }),
  );
  spheres.forEach((m, k) => {
    const isActive = k === active;
    m.scale.setScalar(nodeScale * (isActive ? 1.25 : 0.85));
    m.material.transparent = !isActive;
    m.material.opacity = isActive ? 1 : INACTIVE_PLAYHEAD_OPACITY;
    m.material.depthWrite = isActive;
  });
}

/** Build the scene in `mount` (which must have a size) and start its render loop. */
export function createEmbeddingScene(mount: HTMLDivElement, o: SceneOptions): SceneHandle {
  const { layout, playheads, pathStyle, trackCount } = o;
  let style = o.style;
  let active = o.activeTrack;

  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(SCENE_BG);
  mount.append(renderer.domElement);

  const scene = new Scene();
  const { camera, controls } = createCamera(
    renderer,
    mount.clientWidth / mount.clientHeight,
    style,
    o.camera,
  );
  const follow = createFollowController(camera.position, controls.target, o.followMode, active);
  // Mid-move, remember where the camera is headed (a remount picks up from there)
  const onControlsChange = () => o.onCameraChange(cameraState(follow));
  controls.addEventListener('change', onControlsChange);

  const glow =
    pathStyle === 'glow'
      ? createGlowFx(
          renderer,
          scene,
          camera,
          mount.clientWidth,
          mount.clientHeight,
          style.nodeSize,
          style.lineWidth,
        )
      : null;
  if (pathStyle === 'cividis-tube') {
    addTubeLights(scene);
  }

  const pointsGeo = new BufferGeometry();
  layout.bind(pointsGeo);
  const pointsMat = new PointsMaterial({
    size: style.nodeSize,
    sizeAttenuation: true,
    vertexColors: true,
  });
  const pointsMesh = new Points(pointsGeo, glow ? glow.nodeMaterial : pointsMat);
  pointsMesh.frustumCulled = false;
  // The tube's alternating shading marks the nodes; keep the (hidden) points for hover/click
  pointsMesh.visible = pathStyle !== 'cividis-tube';
  scene.add(pointsMesh);

  const paths = Array.from({ length: trackCount }, () =>
    createPathVisual(pathStyle, scene, style.lineWidth, glow),
  );
  const spheres = createPlayheads(scene, trackCount);
  const grid = createGrid(scene, style.showGrid);
  const raycaster = new Raycaster();
  raycaster.params.Points.threshold = 0.05;

  /** The active track's playhead for the follow camera, if it's shown. */
  const followTarget = (): FollowTarget | null => {
    const track = active;
    const sphere = spheres[track];
    if (!sphere?.visible) {
      return null;
    }
    return {
      position: sphere.position,
      tangent: () =>
        (layout.trackIndices[track]?.length ?? 0) > 1
          ? pathTangentAt(layout, track, at(playheads.positions, track))
          : null,
    };
  };

  const setPoints = (points: ReadonlyArray<ViewerPoint>, tracks: ReadonlyArray<ViewerTrack>) => {
    layout.retarget(points, tracks, SCENE_BG);
    syncPaths(layout, paths);
    playheads.startLayout();
  };

  emphasise(paths, spheres, active, style.nodeSize);
  if (o.points) {
    setPoints(o.points, o.tracks);
  } else {
    // Rebuilt scene (StrictMode remount): bind() restored the draw range
    syncPaths(layout, paths);
  }

  /** Advance the playheads and put each sphere where its playhead is. */
  const placePlayheads = (tweenK: number | null) => {
    playheads.step(
      o.inputs().playheads,
      layout.trackIndices.map((list) => list.length),
      tweenK,
    );
    spheres.forEach((sphere, k) => {
      sphere.visible = playheads.visible[k] ?? false;
      if (sphere.visible) {
        pathAt(layout, paths[k], k, at(playheads.positions, k), sphere.position);
      }
    });
  };

  let animId = 0;
  let lastFrame = performance.now();
  const animate = () => {
    animId = requestAnimationFrame(animate);
    const now = performance.now();
    const dt = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    const n = layout.drawCount;
    // Layout tween progress (null: none running); playheads use it too
    const tweenK = layout.step(now);
    if (tweenK !== null) {
      syncPaths(layout, paths);
    }
    placePlayheads(tweenK);
    // Follow the active track's playhead
    follow.step(now, active, followTarget());
    controls.update(dt);
    if (glow) {
      glow.render(dt, camera.position.distanceTo(controls.target), n, o.inputs().glowStrength);
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

  return {
    setPoints,
    setStyle(next) {
      style = next;
      paths.forEach((p) => p.setLineWidth(next.lineWidth));
      glow?.setLineWidth(next.lineWidth);
      glow?.setNodeSize(next.nodeSize);
      pointsMat.size = next.nodeSize;
      controls.autoRotate = next.autoRotate;
      controls.autoRotateSpeed = next.autoRotateSpeed;
      grid.visible = next.showGrid;
      emphasise(paths, spheres, active, style.nodeSize);
    },
    setActiveTrack(track) {
      active = track;
      emphasise(paths, spheres, active, style.nodeSize);
    },
    setFollowMode(mode) {
      follow.setMode(mode, followTarget());
    },
    cameraState: () => cameraState(follow),
    hitTest(ndc) {
      if (layout.count === 0) {
        return null;
      }
      raycaster.setFromCamera(ndc, camera);
      // Slots past the shown points are fading out: not hoverable
      const index = raycaster
        .intersectObject(pointsMesh)
        .find((h) => h.index !== undefined && h.index < layout.count)?.index;
      return (index === undefined ? undefined : layout.slots[index]) ?? null;
    },
    dispose() {
      cancelAnimationFrame(animId);
      controls.removeEventListener('change', onControlsChange);
      controls.dispose();
      paths.forEach((p) => p.dispose());
      glow?.dispose();
      layout.bind(null);
      pointsGeo.dispose();
      pointsMat.dispose();
      renderer.dispose();
      ro.disconnect();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    },
  };
}
