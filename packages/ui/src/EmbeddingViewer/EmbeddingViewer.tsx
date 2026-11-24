import { Button } from '@cloudflare/kumo';
import type { ButtonProps } from '@cloudflare/kumo';
import { CircleIcon, RecordIcon, TargetIcon } from '@phosphor-icons/react';
import type { MouseEvent as ReactMouseEvent, ReactNode, RefObject } from 'react';
import { useMemo, useRef, useState } from 'react';
import type { Color } from 'three';
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
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import useLatestRef from '../hooks/effects/useLatestRef.ts';
import useOnChange from '../hooks/effects/useOnChange.ts';
import useThreeScene from '../hooks/effects/useThreeScene.ts';
import { swingFollowCamera } from './followCamera.ts';
import { TWEEN_MS, createLayoutTween } from './layoutTween.ts';
import { addTubeLights, createGlowFx, createPathVisual } from './livePathVisuals.ts';
import { at, easeInOutCubic } from './math.ts';
import { createPlayheadEaser } from './playheads.ts';
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

const GRID_SIZE = 6;
const GRID_DIVISIONS = 24;
const GRID_Y = -1.2;
const ACTIVE_LINE_OPACITY = 0.75;
const INACTIVE_LINE_OPACITY = 0.35;
// Unselected tracks' playheads dim like their paths
const INACTIVE_PLAYHEAD_OPACITY = 0.35;
/** Per follow mode: the mode the button steps to next, and how the button shows it (neutral / blue / red, as in v9). */
const FOLLOW_MODES: Readonly<
  Record<
    FollowMode,
    { next: FollowMode; label: string; icon: ReactNode; variant: ButtonProps['variant'] }
  >
> = {
  static: { next: 'tracking', label: 'Static', icon: <TargetIcon />, variant: 'secondary' },
  tracking: { next: 'following', label: 'Tracking', icon: <RecordIcon />, variant: 'primary' },
  following: {
    next: 'static',
    label: 'Following',
    icon: <CircleIcon weight="fill" />,
    variant: 'destructive',
  },
};

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
    spheres: Array<Mesh<SphereGeometry, MeshBasicMaterial>>;
    grid: GridHelper;
    raycaster: Raycaster;
    bgColor: Color;
  } | null>(null);
  // Outlives the scene, so a remount (StrictMode) picks up mid-tween
  const [layout] = useState(() => createLayoutTween(trackCount));
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
  const [playheadEaser] = useState(() => createPlayheadEaser(trackCount));
  const style = useMemo(
    () => ({ lineWidth, nodeSize, autoRotate, autoRotateSpeed, showGrid }),
    [lineWidth, nodeSize, autoRotate, autoRotateSpeed, showGrid],
  );
  const styleRef = useRef(style);
  const glowStrengthRef = useLatestRef(glowStrength);
  const onCameraChangeRef = useLatestRef(onCameraChange);

  const pointAt = (i: number, out: Vector3) => {
    const arr = layout.positions;
    return out.set(at(arr, i * 3), at(arr, i * 3 + 1), at(arr, i * 3 + 2));
  };

  const pathAt = (track: number, t: number, out: Vector3) => {
    const idx = layout.trackIndices[track] ?? [];
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
    const idx = layout.trackIndices[track] ?? [];
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
    const pos = layout.positions;
    const col = layout.colors;
    s.paths.forEach((path, k) => {
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
    s.spheres.forEach((m, k) => {
      const isActive = k === active;
      m.scale.setScalar(nodeScale * (isActive ? 1.25 : 0.85));
      m.material.transparent = !isActive;
      m.material.opacity = isActive ? 1 : INACTIVE_PLAYHEAD_OPACITY;
      m.material.depthWrite = isActive;
    });
  };

  const retarget = (next: ReadonlyArray<ViewerPoint>) => {
    const s = sceneRef.current;
    if (!s) {
      pendingPointsRef.current = next;
      return;
    }
    layout.retarget(next, tracksRef.current, s.bgColor);
    syncLines();
    playheadEaser.startLayout();
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
    layout.bind(pointsGeo);
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
      // Rebuilt scene (StrictMode remount): bind() restored the draw range
      syncLines();
    }

    let animId = 0;
    let lastFollowed = activeTrackRef.current;
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
        syncLines();
      }

      playheadEaser.step(
        playheadsRef.current,
        layout.trackIndices.map((list) => list.length),
        tweenK,
      );
      spheres.forEach((sphere, k) => {
        sphere.visible = playheadEaser.visible[k] ?? false;
        if (sphere.visible) {
          pathAt(k, at(playheadEaser.positions, k), sphere.position);
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
        (layout.trackIndices[active]?.length ?? 0) > 1
      ) {
        const newTarget = followed.position.clone();
        const offset = camPos.clone().sub(prevFollowTargetRef.current);
        swingFollowCamera(
          offset,
          prevPathTangentRef.current,
          pathTangentAt(active, at(playheadEaser.positions, active)),
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
      layout.bind(null);
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
    if (!s || layout.count === 0) {
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
      .find((h) => h.index !== undefined && h.index < layout.count)?.index;
    const slot = index === undefined ? undefined : layout.slots[index];
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

  const follow = FOLLOW_MODES[followMode];

  // The scene is always dark, so the chrome over it uses Kumo's dark tokens
  return (
    <div
      data-mode="dark"
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
          className="kumo-tooltip-popup absolute pointer-events-none z-10 max-w-[240px] whitespace-pre-wrap rounded-md bg-kumo-base px-2.5 py-1.5 text-sm text-kumo-default shadow-md outline outline-kumo-line"
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
      <Button
        size="sm"
        variant={follow.variant}
        icon={follow.icon}
        className="absolute bottom-2 left-2 z-10 select-none"
        onClick={(e) => {
          e.stopPropagation();
          const next = follow.next;
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
            if (next === 'following' && tween && (layout.trackIndices[active]?.length ?? 0) > 1) {
              const tangent = pathTangentAt(active, at(playheadEaser.positions, active));
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
        {follow.label}
      </Button>
    </div>
  );
}
