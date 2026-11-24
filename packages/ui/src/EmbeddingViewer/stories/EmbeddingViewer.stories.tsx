import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';
import useInterval from '../../hooks/effects/useInterval.ts';
import EmbeddingViewer from '../EmbeddingViewer.tsx';
import type { EmbeddingViewerProps, ViewerPoint, ViewerTrack } from '../types.ts';

const POINTS_PER_TRACK = 60;
const TICK_MS = 50;
// Nodes a playhead moves per tick: 5 nodes a second
const PLAYHEAD_STEP = 0.25;
const TRACKS: ReadonlyArray<ViewerTrack> = [
  { label: 'Spiral A' },
  { label: 'Spiral B' },
  { label: 'Spiral C' },
];

/** mulberry32: a small seeded PRNG, so every load draws the same spirals. */
function seededRandom(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d_2b_79_f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Three interleaved helices climbing through roughly [-1, 1]^3, with a little seeded jitter. */
function makeSpirals(): ReadonlyArray<ViewerPoint> {
  const random = seededRandom(9);
  return TRACKS.flatMap((track, k) =>
    Array.from({ length: POINTS_PER_TRACK }, (_, i): ViewerPoint => {
      const u = i / (POINTS_PER_TRACK - 1);
      const angle = u * 4 * Math.PI + (k * 2 * Math.PI) / TRACKS.length;
      const radius = 0.7 + (random() - 0.5) * 0.1;
      const y = -1 + 2 * u + (random() - 0.5) * 0.05;
      return {
        key: `${k}:${i}`,
        position: [radius * Math.cos(angle), y, radius * Math.sin(angle)],
        track: k,
        label: `${track.label}, point ${i + 1}`,
      };
    }),
  );
}

const SPIRALS = makeSpirals();

type SpiralsArgs = Pick<
  EmbeddingViewerProps,
  | 'pathStyle'
  | 'lineWidth'
  | 'nodeSize'
  | 'glowStrength'
  | 'showGrid'
  | 'autoRotate'
  | 'autoRotateSpeed'
  | 'activeTrack'
> & {
  showSpiralA: boolean;
  showSpiralB: boolean;
  showSpiralC: boolean;
};

/** Hidden spirals drop their points (they fade out) and their playhead. */
function SyntheticSpiralsDemo({ showSpiralA, showSpiralB, showSpiralC, ...viewer }: SpiralsArgs) {
  const [tick, setTick] = useState(0);
  useInterval(() => setTick((t) => t + 1), TICK_MS);
  const shown = [showSpiralA, showSpiralB, showSpiralC];
  const points = useMemo(() => {
    const visible = [showSpiralA, showSpiralB, showSpiralC];
    return SPIRALS.filter((point) => visible[point.track]);
  }, [showSpiralA, showSpiralB, showSpiralC]);
  // Staggered so the playheads don't overlap; each wraps to the start, which reads as a seek
  const playheads = TRACKS.map((_, k) =>
    shown[k] ? (tick * PLAYHEAD_STEP + k * 20) % POINTS_PER_TRACK : null,
  );
  return <EmbeddingViewer {...viewer} points={points} tracks={TRACKS} playheads={playheads} />;
}

const meta = {
  title: 'EmbeddingViewer',
  tags: ['!autodocs'],
  component: SyntheticSpiralsDemo,
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
    autoRotate: { control: 'boolean' },
    autoRotateSpeed: { control: { type: 'range', min: 0, max: 10, step: 0.5 } },
    activeTrack: { control: 'inline-radio', options: [0, 1, 2] },
    showSpiralA: { control: 'boolean' },
    showSpiralB: { control: 'boolean' },
    showSpiralC: { control: 'boolean' },
  },
  args: {
    pathStyle: 'original',
    lineWidth: 3,
    nodeSize: 0.04,
    glowStrength: 1,
    showGrid: true,
    autoRotate: false,
    autoRotateSpeed: 1,
    activeTrack: 0,
    showSpiralA: true,
    showSpiralB: true,
    showSpiralC: true,
  },
} satisfies Meta<typeof SyntheticSpiralsDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SyntheticSpirals: Story = {};
