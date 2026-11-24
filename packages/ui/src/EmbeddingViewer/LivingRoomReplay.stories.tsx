import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useRef, useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import useInterval from '../hooks/effects/useInterval.ts';
import EmbeddingViewer from './EmbeddingViewer.tsx';
import livingRoom from './fixtures/living-room.json';
import { expectNoPageErrors, recordDataset, sleep } from './storyChecks.ts';
import type { CameraState, EmbeddingViewerProps, FollowMode, Vec3, ViewerPoint } from './types.ts';

const TICK_MS = 50;
const TWEEN_MS = 900;
const FINAL_LAYOUT = livingRoom.layouts.length - 1;
const FOLLOW_BUTTON = { name: /Static|Tracking|Following/ };

interface FixtureLayout {
  atMs: number;
  visibleTracks: ReadonlyArray<number> | null;
  keys: ReadonlyArray<number>;
  positions: ReadonlyArray<ReadonlyArray<number>>;
}

const LAYOUTS: ReadonlyArray<FixtureLayout> = livingRoom.layouts;
const ENTRIES = livingRoom.entries;

/** One recorded worker layout as viewer input, with each playhead at the end of its path as v9's clamped highlight is while live. */
function toFrame(layout: FixtureLayout, trackCount: number) {
  const points = layout.keys.map((key, i): ViewerPoint => {
    const entry = ENTRIES[key];
    const [x = 0, y = 0, z = 0] = layout.positions[i] ?? [];
    const position: Vec3 = [x, y, z];
    return { key, position, track: entry?.track ?? 0, label: entry?.label };
  });
  const playheads = Array.from({ length: trackCount }, (_, k) => {
    const visible = layout.visibleTracks?.includes(k) ?? true;
    const length = points.filter((point) => point.track === k).length;
    return visible && length > 0 ? length - 1 : null;
  });
  return { points, playheads };
}

type ReplayArgs = Pick<
  EmbeddingViewerProps,
  | 'pathStyle'
  | 'lineWidth'
  | 'nodeSize'
  | 'glowStrength'
  | 'showGrid'
  | 'activeTrack'
  | 'onCameraChange'
> & {
  /** First and last recorded layout to replay (inclusive). */
  fromLayout: number;
  toLayout: number;
  /** Replay speed relative to the recording. */
  speed: number;
};

const visibility = (playhead: number | null | undefined) =>
  playhead === null || playhead === undefined ? 'hidden' : 'shown';

/** Replays recorded v9 layouts on their recorded timing, then holds on the last one. */
function LivingRoomReplay({ fromLayout, toLayout, speed, ...viewer }: ReplayArgs) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const lastTickRef = useRef<number | null>(null);
  useInterval(() => {
    const now = performance.now();
    const realMs = lastTickRef.current === null ? TICK_MS : now - lastTickRef.current;
    lastTickRef.current = now;
    setElapsedMs((ms) => ms + realMs * speed);
  }, TICK_MS);
  const startMs = LAYOUTS[fromLayout]?.atMs ?? 0;
  let index = fromLayout;
  while (index < toLayout && (LAYOUTS[index + 1]?.atMs ?? Infinity) - startMs <= elapsedMs) {
    index++;
  }
  const layout = LAYOUTS[index];
  const frame = useMemo(() => (layout ? toFrame(layout, livingRoom.tracks.length) : null), [layout]);
  if (!frame) {
    return null;
  }
  const { playheads } = frame;
  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <EmbeddingViewer {...viewer} tracks={livingRoom.tracks} points={frame.points} playheads={playheads} />
      <output
        data-testid="replay-status"
        data-layout={index}
        data-points={frame.points.length}
        data-playhead-a={visibility(playheads[0])}
        data-playhead-b={visibility(playheads[1])}
        style={{ position: 'absolute', top: 8, left: 8, color: 'white', font: '11px monospace', opacity: 0.7 }}
      >
        layout {index} of {fromLayout}–{toLayout} · {frame.points.length} points
        {visibility(playheads[1]) === 'hidden' ? ' · B playhead hidden' : ''}
      </output>
    </div>
  );
}

const meta = {
  title: 'EmbeddingViewer/Parity with v9',
  tags: ['!autodocs'],
  component: LivingRoomReplay,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    pathStyle: { control: 'select', options: ['original', 'cividis-tube', 'glow'] },
    lineWidth: { control: { type: 'range', min: 1, max: 10, step: 0.5 } },
    nodeSize: { control: { type: 'range', min: 0.01, max: 0.15, step: 0.005 } },
    glowStrength: { control: { type: 'range', min: 0, max: 3, step: 0.1 } },
    showGrid: { control: 'boolean' },
    activeTrack: { control: 'inline-radio', options: [0, 1] },
    speed: { control: { type: 'range', min: 0.5, max: 10, step: 0.5 } },
    fromLayout: { control: { type: 'number', min: 0, max: FINAL_LAYOUT } },
    toLayout: { control: { type: 'number', min: 0, max: FINAL_LAYOUT } },
  },
  args: {
    pathStyle: 'original',
    lineWidth: 3,
    nodeSize: 0.04,
    glowStrength: 1,
    showGrid: true,
    activeTrack: 0,
    speed: 4,
    fromLayout: 0,
    toLayout: FINAL_LAYOUT,
  },
} satisfies Meta<typeof LivingRoomReplay>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * v9 after jumping ahead on the timeline: the worker catches up 20 segments
 * per layout. Each playhead should glide along its newly placed segments in
 * step with the point tween (commits 33471b7, 5ac6160), not race to the end.
 */
export const CatchUpInBatches: Story = {
  args: { fromLayout: 0, toLayout: 9 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = await canvas.findByTestId('replay-status');
    await expect(canvasElement.querySelector('canvas')).not.toBeNull();
    await waitFor(() => expect(status.dataset.layout).toBe('9'), { timeout: 30_000, interval: 250 });
    await expect(status).toHaveTextContent('192 points');
  },
};

/**
 * v9 playing live: each layout adds one segment (192 to 218 points). Each
 * playhead eases onto its new end with the point tween instead of jumping
 * there (commit 33471b7). The easing is visual; the play checks the replay
 * reaches the last layout with every point and never loses any on the way.
 */
export const LiveGrowth: Story = {
  args: { fromLayout: 9, toLayout: 33 },
  play: async ({ canvasElement }) => {
    const status = await within(canvasElement).findByTestId('replay-status');
    const history = recordDataset(status);
    await waitFor(() => expect(status.dataset.layout).toBe('33'), { timeout: 40_000, interval: 250 });
    history.stop();
    await expect(status.dataset.points).toBe('218');
    const counts = history.seen.map((state) => Number(state.points));
    await expect(counts).toEqual(counts.toSorted((a, b) => a - b));
  },
};

/**
 * v9's eye button hides session B: the worker re-lays out session A alone
 * (218 points down to 104), B's points fade out and its playhead goes; showing
 * B again brings back both sessions (222 points) and its playhead
 * (commit 9ff9e54).
 */
export const HideAndShowSession: Story = {
  args: { fromLayout: 32, toLayout: 40 },
  play: async ({ canvasElement }) => {
    const status = await within(canvasElement).findByTestId('replay-status');
    const history = recordDataset(status);
    await waitFor(() => expect(status.dataset.layout).toBe('40'), { timeout: 20_000, interval: 100 });
    history.stop();
    const states = history.seen.map((state) => ({
      points: Number(state.points),
      playheadB: state.playheadB,
    }));
    const hiddenAt = states.findIndex((state) => state.playheadB === 'hidden');
    const shownAgainAt = states.findIndex((state, i) => i > hiddenAt && state.playheadB === 'shown');
    await expect(states[hiddenAt - 1]).toEqual({ points: 218, playheadB: 'shown' });
    await expect(states[hiddenAt]).toEqual({ points: 104, playheadB: 'hidden' });
    await expect(states[shownAgainAt]).toEqual({ points: 222, playheadB: 'shown' });
  },
};

type CameraSpy = ReturnType<typeof fn<(state: CameraState) => void>>;
const followModes = (spy: CameraSpy): Array<FollowMode> => spy.mock.calls.map(([state]) => state.followMode);

const followModeGlideSpy: CameraSpy = fn();

/**
 * The follow button cycles Static, Tracking, Following. Each switch glides
 * the camera onto the playhead with the point tween's timing instead of
 * cutting, and reports the mode it switched to (commit add3740).
 */
export const FollowModeGlide: Story = {
  args: { fromLayout: 9, toLayout: 33, onCameraChange: followModeGlideSpy },
  play: async ({ canvasElement }) => {
    const spy = followModeGlideSpy;
    const canvas = within(canvasElement);
    await expectNoPageErrors(async () => {
      for (const mode of ['tracking', 'following', 'static'] as const) {
        await userEvent.click(await canvas.findByRole('button', FOLLOW_BUTTON));
        await waitFor(() => expect(followModes(spy).at(-1)).toBe(mode));
        await sleep(TWEEN_MS);
      }
    });
    const modes = followModes(spy);
    const changes = modes.filter((mode, i) => mode !== modes[i - 1]);
    await expect(changes.slice(-3)).toEqual(['tracking', 'following', 'static']);
  },
};
