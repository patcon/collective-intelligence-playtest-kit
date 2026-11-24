import type { LiveRenderer } from './lib/livePathVisuals.ts';

export type Vec3 = readonly [number, number, number];

export interface ViewerPoint {
  /** Stable across layouts, so a point tweens from where it was. */
  key: string | number;
  position: Vec3;
  /** Index into `tracks`. Points of one track are drawn as a path in array order. */
  track: number;
  label?: string;
}

export interface ViewerTrack {
  /** Shown in the hover tooltip (v9 used "Session A"). */
  label: string;
  /** Gradient stops along the path, start to end, as CSS hex. Defaults to the v9 palette for that index. */
  colors?: ReadonlyArray<string>;
}

export type FollowMode = 'static' | 'tracking' | 'following';

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  followMode: FollowMode;
}

export interface EmbeddingViewerProps {
  /** Shared embedding space, already aligned. Points with a `track` outside `tracks` are ignored. */
  points: ReadonlyArray<ViewerPoint>;
  tracks: ReadonlyArray<ViewerTrack>;
  /** Per track: fractional node index along that track's own path. null or missing hides that playhead. */
  playheads?: ReadonlyArray<number | null>;
  /** Track whose playhead the camera follows and that's drawn on top. Default 0. */
  activeTrack?: number;
  /** Called with the clicked point and its index in `points`. */
  onPointClick?: (point: ViewerPoint, index: number) => void;
  /** Read on mount only. */
  initialCamera?: CameraState;
  onCameraChange?: (state: CameraState) => void;
  /** Changing it, or the number of tracks, rebuilds the scene and keeps the camera. */
  pathStyle?: LiveRenderer;
  lineWidth?: number;
  nodeSize?: number;
  /** Bloom intensity multiplier ('glow' only). */
  glowStrength?: number;
  showGrid?: boolean;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
}
