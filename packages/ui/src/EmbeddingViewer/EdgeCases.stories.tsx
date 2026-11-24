import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import EmbeddingViewer from './EmbeddingViewer.tsx';
import { clickAt, expectNoPageErrors, findViewerCanvas, litPixels } from './storyChecks.ts';
import type { CameraState, ViewerPoint } from './types.ts';

const CAMERA: CameraState = { position: [0, 0, 3], target: [0, 0, 0], followMode: 'static' };
const ONLY_POINT: ViewerPoint = { key: 'only', position: [0, 0, 0], track: 0, label: 'The only segment' };
const FOLLOW_BUTTON = { name: /Static|Tracking|Following/ };

const meta = {
  title: 'EmbeddingViewer/Edge cases',
  tags: ['!autodocs'],
  component: EmbeddingViewer,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    tracks: [{ label: 'Session A' }],
    points: [],
    initialCamera: CAMERA,
    showGrid: false,
  },
} satisfies Meta<typeof EmbeddingViewer>;

export default meta;

type Story = StoryObj<typeof meta>;

const emptyCameraSpy = fn<(state: CameraState) => void>();
const emptyClickSpy = fn<(point: ViewerPoint, index: number) => void>();

/**
 * A transcript with nothing embedded yet: no points and no playhead. The
 * follow button still cycles its modes, and a click on the empty scene hits
 * nothing.
 */
export const Empty: Story = {
  args: { points: [], playheads: [], onCameraChange: emptyCameraSpy, onPointClick: emptyClickSpy },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expectNoPageErrors(async () => {
      const viewer = await findViewerCanvas(canvasElement);
      for (const mode of ['tracking', 'following', 'static'] as const) {
        await userEvent.click(await canvas.findByRole('button', FOLLOW_BUTTON));
        await waitFor(() => expect(emptyCameraSpy.mock.lastCall?.[0].followMode).toBe(mode));
      }
      await clickAt(viewer, [0, 0, 0], CAMERA);
      await expect(emptyClickSpy).not.toHaveBeenCalled();
    });
  },
};

const singleClickSpy = fn<(point: ViewerPoint, index: number) => void>();

/**
 * The first segment of a transcript: one point, with the playhead on it. It
 * is drawn, and clicking it reports that point.
 */
export const SinglePoint: Story = {
  args: { points: [ONLY_POINT], playheads: [0], onPointClick: singleClickSpy },
  play: async ({ canvasElement }) => {
    await expectNoPageErrors(async () => {
      const viewer = await findViewerCanvas(canvasElement);
      await waitFor(async () => expect(await litPixels(viewer)).toBeGreaterThan(0));
      await waitFor(async () => {
        await clickAt(viewer, ONLY_POINT.position, CAMERA);
        await expect(singleClickSpy).toHaveBeenCalledWith(ONLY_POINT, 0);
      });
    });
  },
};

const segment = (i: number, x: number, y: number): ViewerPoint => ({
  key: i,
  position: [x, y, 0],
  track: 0,
  label: `Segment ${i}`,
});
const MIDDLE = segment(2, 0, 0);
const PATH: ReadonlyArray<ViewerPoint> = [
  segment(0, -0.6, 0),
  segment(1, -0.3, 0.1),
  MIDDLE,
  segment(3, 0.3, -0.1),
  segment(4, 0.6, 0),
];

/**
 * Draws `pathStyle`, the playhead rides it into 'following' mode (the camera
 * swings round behind it), and clicking a point on the path reports it.
 */
function pathStyleStory(pathStyle: 'cividis-tube' | 'glow'): Story {
  const clickSpy = fn<(point: ViewerPoint, index: number) => void>();
  const cameraSpy = fn<(state: CameraState) => void>();
  return {
    args: {
      points: PATH,
      playheads: [2],
      pathStyle,
      onPointClick: clickSpy,
      onCameraChange: cameraSpy,
    },
    play: async ({ canvasElement }) => {
      const canvas = within(canvasElement);
      await expectNoPageErrors(async () => {
        const viewer = await findViewerCanvas(canvasElement);
        await waitFor(async () => expect(await litPixels(viewer)).toBeGreaterThan(0));
        await waitFor(async () => {
          await clickAt(viewer, MIDDLE.position, CAMERA);
          await expect(clickSpy).toHaveBeenCalledWith(MIDDLE, 2);
        });
        for (const mode of ['tracking', 'following'] as const) {
          await userEvent.click(await canvas.findByRole('button', FOLLOW_BUTTON));
          await waitFor(() => expect(cameraSpy.mock.lastCall?.[0].followMode).toBe(mode));
        }
        // Following glides behind the playhead
        await waitFor(() => expect(cameraSpy.mock.lastCall?.[0].position).not.toEqual(CAMERA.position));
        await waitFor(async () => expect(await litPixels(viewer)).toBeGreaterThan(0));
      });
    },
  };
}

/** A short path drawn as a shaded tube. The points are hidden, but still hoverable and clickable. */
export const TubePath: Story = pathStyleStory('cividis-tube');

/** A short path drawn as glowing particles, through bloom. */
export const GlowPath: Story = pathStyleStory('glow');
