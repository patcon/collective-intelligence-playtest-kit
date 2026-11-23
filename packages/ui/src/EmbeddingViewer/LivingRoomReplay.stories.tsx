import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';
import useInterval from '../hooks/effects/useInterval.ts';
import EmbeddingViewer from './EmbeddingViewer.tsx';
import livingRoom from './fixtures/living-room.json';
import type { EmbeddingViewerProps, Vec3, ViewerPoint } from './types.ts';

const TICK_MS = 50;

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
  'pathStyle' | 'lineWidth' | 'nodeSize' | 'glowStrength' | 'showGrid' | 'activeTrack'
> & {
  /** First and last recorded layout to replay (inclusive). */
  fromLayout: number;
  toLayout: number;
  /** Replay speed relative to the recording. */
  speed: number;
};

/** Replays recorded v9 layouts on their recorded timing, then holds on the last one. */
function LivingRoomReplay({ fromLayout, toLayout, speed, ...viewer }: ReplayArgs) {
  const [elapsedMs, setElapsedMs] = useState(0);
  useInterval(() => setElapsedMs((ms) => ms + TICK_MS * speed), TICK_MS);
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
  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <EmbeddingViewer {...viewer} tracks={livingRoom.tracks} points={frame.points} playheads={frame.playheads} />
      <output
        data-testid="replay-status"
        data-layout={index}
        style={{ position: 'absolute', top: 8, left: 8, color: 'white', font: '11px monospace', opacity: 0.7 }}
      >
        layout {index} of {fromLayout}–{toLayout} · {frame.points.length} points
      </output>
    </div>
  );
}

const meta = {
  title: 'EmbeddingViewer/Parity with v9',
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
    fromLayout: { control: { type: 'number', min: 0, max: LAYOUTS.length - 1 } },
    toLayout: { control: { type: 'number', min: 0, max: LAYOUTS.length - 1 } },
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
    toLayout: LAYOUTS.length - 1,
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
