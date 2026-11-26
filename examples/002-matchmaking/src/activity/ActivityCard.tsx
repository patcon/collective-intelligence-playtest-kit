import { Surface } from '@cloudflare/kumo';
import type { ReactNode } from 'react';

/**
 * Stands in for the activity that matching is for, which this demo doesn't have. Participants and
 * the emcee both see it after Start activity; `children` says who it's for.
 */
export function ActivityCard({ children }: { children: ReactNode }) {
  return (
    <Surface className="flex w-full max-w-sm flex-col items-center gap-3 rounded-lg border border-dashed border-kumo-line p-6 text-center">
      <p className="text-xs font-medium tracking-wide text-kumo-subtle uppercase">Placeholder</p>
      <h2 className="text-2xl font-semibold">Activity</h2>
      <p className="text-kumo-subtle">This is where each group would now do the activity they were matched for.</p>
      {children}
    </Surface>
  );
}
