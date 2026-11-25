import { Button, Surface, Switch } from '@cloudflare/kumo';
import { MAX_SIMS } from './SimulatedCrowd.ts';
import type { Simulation } from './useSimulation.ts';

/** How many simulated participants are in the room, and whether they tap "found them" by themselves. */
export function SimControls({ simulation }: { simulation: Simulation }) {
  const count = simulation.sims.length;
  return (
    <Surface className="flex flex-col gap-3 rounded-lg p-5">
      <h2 className="text-lg font-semibold">Simulation</h2>
      <div className="flex items-center gap-3">
        <Button aria-label="Remove a simulated participant" disabled={count === 0} onClick={() => simulation.setCount(count - 1)}>
          −
        </Button>
        <span aria-live="polite" className="min-w-16 text-center tabular-nums">
          {count} {count === 1 ? 'sim' : 'sims'}
        </span>
        <Button aria-label="Add a simulated participant" disabled={count === MAX_SIMS} onClick={() => simulation.setCount(count + 1)}>
          +
        </Button>
        <Button disabled={count === MAX_SIMS} onClick={() => simulation.setCount(MAX_SIMS)} variant="secondary">
          Fill to {MAX_SIMS}
        </Button>
      </div>
      <Switch
        checked={simulation.autoConfirm}
        label="Tap “found them” by themselves (after 2–8 s)"
        onCheckedChange={(on) => simulation.setAutoConfirm(on)}
      />
    </Surface>
  );
}
