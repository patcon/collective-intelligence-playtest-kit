import type { MouseEvent as ReactMouseEvent, RefObject } from 'react';
import { useMemo, useRef, useState } from 'react';
import { Vector2 } from 'three';
import useLatestRef from '../hooks/effects/useLatestRef.ts';
import useOnChange from '../hooks/effects/useOnChange.ts';
import useThreeScene from '../hooks/effects/useThreeScene.ts';
import FollowButton from './components/FollowButton.tsx';
import { createLayoutTween } from './lib/layoutTween.ts';
import type { LiveRenderer } from './lib/livePathVisuals.ts';
import { createPlayheadEaser } from './lib/playheads.ts';
import PointTooltip from './components/PointTooltip.tsx';
import { DEFAULT_NODE_SIZE, createEmbeddingScene } from './lib/scene.ts';
import type { SceneHandle } from './lib/scene.ts';
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
const NO_PLAYHEADS: ReadonlyArray<number | null> = [];
/** Pointer travel (px, squared) past which a press is a drag of the camera, not a click on a point. */
const CLICK_SLOP_SQ = 25;

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
  const sceneRef = useRef<SceneHandle | null>(null);
  // Outlive the scene, so a remount (StrictMode) picks up mid-tween
  const [layout] = useState(() => createLayoutTween(trackCount));
  const [playheadEaser] = useState(() => createPlayheadEaser(trackCount));
  /** Points that arrived before the scene was built (it waits for the mount to have a size). */
  const pendingPointsRef = useRef<ReadonlyArray<ViewerPoint> | null>(points);
  const tracksRef = useLatestRef(tracks);
  const playheadsRef = useLatestRef(playheads);
  const glowStrengthRef = useLatestRef(glowStrength);
  const onCameraChangeRef = useLatestRef(onCameraChange);
  const activeTrackRef = useRef(activeTrack);
  const style = useMemo(
    () => ({ lineWidth, nodeSize, autoRotate, autoRotateSpeed, showGrid }),
    [lineWidth, nodeSize, autoRotate, autoRotateSpeed, showGrid],
  );
  const styleRef = useRef(style);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
    track: number;
  } | null>(null);

  useThreeScene(mountRef, (mount) => {
    const handle = createEmbeddingScene(mount, {
      pathStyle,
      trackCount,
      style: styleRef.current,
      activeTrack: activeTrackRef.current,
      followMode,
      camera: cameraRef.current,
      points: pendingPointsRef.current,
      tracks: tracksRef.current,
      layout,
      playheads: playheadEaser,
      inputs: () => ({ playheads: playheadsRef.current, glowStrength: glowStrengthRef.current }),
      onCameraChange: (state) => onCameraChangeRef.current?.(state),
    });
    pendingPointsRef.current = null;
    sceneRef.current = handle;
    return () => {
      handle.dispose();
      sceneRef.current = null;
    };
  });

  useOnChange(points, (next) => {
    if (sceneRef.current) {
      sceneRef.current.setPoints(next, tracksRef.current);
    } else {
      pendingPointsRef.current = next;
    }
  });
  useOnChange(activeTrack, (value) => {
    activeTrackRef.current = value;
    sceneRef.current?.setActiveTrack(value);
  });
  useOnChange(style, (value) => {
    styleRef.current = value;
    sceneRef.current?.setStyle(value);
  });

  const hitTest = (e: ReactMouseEvent<HTMLDivElement>) => {
    const s = sceneRef.current;
    if (!s) {
      return null;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const ndc = new Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const slot = s.hitTest(ndc);
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
    if (dx * dx + dy * dy > CLICK_SLOP_SQ) {
      return;
    }
    const hit = hitTest(e);
    if (hit) {
      onPointClick?.(hit.slot.point, hit.slot.index);
    }
  };

  const changeFollowMode = (next: FollowMode) => {
    onFollowModeChange(next);
    const s = sceneRef.current;
    if (s) {
      s.setFollowMode(next);
      // Report where the camera is headed, not where it is mid-move
      onCameraChange?.(s.cameraState());
    }
  };

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
      {tooltip && <PointTooltip {...tooltip} tracks={tracks} />}
      <FollowButton mode={followMode} onChange={changeFollowMode} />
    </div>
  );
}
