import { PerspectiveCamera, Vector3 } from 'three';
import { expect, fireEvent, waitFor } from 'storybook/test';
import type { CameraState, Vec3 } from './types.ts';

/**
 * Runs `play` and fails if anything on the page threw meanwhile, the
 * viewer's animation loop included (its errors never reach the play's stack).
 */
export async function expectNoPageErrors(play: () => Promise<void>) {
  const errors: Array<unknown> = [];
  const onError = (event: ErrorEvent) => errors.push(event.error ?? event.message);
  const onRejection = (event: PromiseRejectionEvent) => errors.push(event.reason);
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  try {
    await play();
  } finally {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  }
  await expect(errors).toEqual([]);
}

/** Resolves on the next animation frame. */
export function nextFrame(): Promise<number> {
  return new Promise((resolve) => {
    requestAnimationFrame(resolve);
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** The viewer's WebGL canvas, once it is mounted. */
export function findViewerCanvas(root: HTMLElement): Promise<HTMLCanvasElement> {
  return waitFor(() => {
    const canvas = root.querySelector('canvas');
    if (!canvas) {
      throw new Error('The viewer has not mounted its canvas yet');
    }
    return canvas;
  });
}

/**
 * Pixels brighter than the black background in the viewer's last drawn frame.
 * Read in a frame callback queued after the viewer's own, before the
 * drawing buffer is presented and cleared.
 */
export async function litPixels(canvas: HTMLCanvasElement): Promise<number> {
  await nextFrame();
  const copy = document.createElement('canvas');
  copy.width = canvas.width;
  copy.height = canvas.height;
  const context = copy.getContext('2d');
  if (!context) {
    throw new Error('No 2D context to read the WebGL canvas into');
  }
  context.drawImage(canvas, 0, 0);
  const { data } = context.getImageData(0, 0, copy.width, copy.height);
  let lit = 0;
  for (let i = 0; i < data.length; i += 4) {
    if ((data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0) > 24) {
      lit++;
    }
  }
  return lit;
}

/** Every distinct state of an element's data attributes from now until `stop()`, starting with the current one. */
export function recordDataset(element: HTMLElement) {
  const read = () => Object.fromEntries(Object.entries(element.dataset));
  const seen: Array<Record<string, string | undefined>> = [read()];
  const observer = new MutationObserver(() => {
    const next = read();
    if (JSON.stringify(next) !== JSON.stringify(seen.at(-1))) {
      seen.push(next);
    }
  });
  observer.observe(element, { attributes: true });
  return { seen, stop: () => observer.disconnect() };
}

/** Clicks the viewer where `position` lands on screen for a camera at `camera`. */
export async function clickAt(canvas: HTMLCanvasElement, position: Vec3, camera: CameraState) {
  const rect = canvas.getBoundingClientRect();
  const eye = new PerspectiveCamera(60, rect.width / rect.height, 0.01, 100);
  eye.position.set(...camera.position);
  eye.lookAt(...camera.target);
  eye.updateMatrixWorld();
  const ndc = new Vector3(...position).project(eye);
  const at = {
    clientX: rect.left + ((ndc.x + 1) / 2) * rect.width,
    clientY: rect.top + ((1 - ndc.y) / 2) * rect.height,
  };
  await fireEvent.mouseDown(canvas, at);
  await fireEvent.mouseUp(canvas, at);
  await fireEvent.click(canvas, at);
}
