import type { Vector2 } from 'three';
import type { FollowController } from './followCamera.ts';
import type { LayoutTween, Slot } from './layoutTween.ts';
import type { LiveRenderer } from './livePathVisuals.ts';
import type { PlayheadEaser } from './playheads.ts';
import type { CameraState, FollowMode } from './types.ts';

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
  readonly follow: FollowController;
  setStyle(style: SceneStyle): void;
  setActiveTrack(track: number): void;
  /** Rebuild every track's path from the layout's displayed buffers. */
  syncPaths(): void;
  /** The shown point under `ndc` (normalised device coordinates), if any. Fading-out points aren't hit. */
  hitTest(ndc: Vector2): Slot | null;
  dispose(): void;
}
