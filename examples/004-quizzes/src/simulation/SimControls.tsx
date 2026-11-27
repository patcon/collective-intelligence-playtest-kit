import { Slider, Surface, Tabs } from '@cloudflare/kumo';
import { MAX_SIMS } from './QuizCrowd.ts';
import type { Simulation } from './useSimulation.ts';

/** Skip thresholds to pick from, as tab values: "any" is no limit. */
const THRESHOLDS = [
  { label: 'Any', value: 'any' },
  { label: '0', value: '0' },
  { label: '≤ 1', value: '1' },
  { label: '≤ 2', value: '2' },
  { label: '≤ 5', value: '5' },
];

function thresholdOf(value: string): number | null {
  return value === 'any' ? null : Number(value);
}

/** How many simulated people are in the room, and how much of the real data they may have skipped. */
export function SimControls({ simulation }: { simulation: Simulation }) {
  const count = simulation.sims.length;
  return (
    <Surface className="flex flex-col gap-4 rounded-lg p-5">
      <h2 className="text-lg font-semibold">Simulation</h2>
      <Slider
        label={`People: ${count} of ${MAX_SIMS}`}
        max={MAX_SIMS}
        min={0}
        onValueChange={(value) => typeof value === 'number' && simulation.setCount(value)}
        value={count}
      />
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Skipped at most (in the real data, for sims added next)</span>
        <Tabs
          onValueChange={(value) => simulation.setMaxSkipped(thresholdOf(value))}
          tabs={THRESHOLDS}
          value={simulation.maxSkipped === null ? 'any' : String(simulation.maxSkipped)}
        />
      </div>
      {/* Its line is kept even when empty, so the panel doesn't jump. */}
      <p className="min-h-5 text-sm text-kumo-subtle">
        {simulation.short > 0 ? `${simulation.short} fewer than asked for: no one else in the sample skipped that few.` : null}
      </p>
    </Surface>
  );
}
