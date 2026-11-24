import { useState } from 'react';
import { useInterval } from '../../hooks/effects/useInterval.ts';
import { useOnChange } from '../../hooks/effects/useOnChange.ts';
import { createActivityTracker } from '../lib/activity.ts';
import type { Activity, ActivityTracker } from '../lib/activity.ts';

/** How often to check whether a running remote has gone idle. */
const CHECK_MS = 200;

/**
 * What someone is doing with the remote, reported through `onActivity` whenever it changes:
 * `arrived` until `started`, then `active` or `idle` from what's fed to the returned tracker.
 */
export function useActivity(started: boolean, onActivity: ((activity: Activity) => void) | undefined): ActivityTracker {
  const [tracker] = useState(createActivityTracker);
  const [running, setRunning] = useState<Exclude<Activity, 'arrived'>>('idle');

  useInterval(() => setRunning(tracker.at(performance.now())), CHECK_MS, started);
  useOnChange<Activity>(started ? running : 'arrived', onActivity);

  return tracker;
}
