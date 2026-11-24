import { useState } from 'react';
import { useInterval } from '../../hooks/effects/useInterval.ts';
import { useOnChange } from '../../hooks/effects/useOnChange.ts';
import { createActivityTracker, DEFAULT_IDLE } from '../lib/activity.ts';
import type { Activity, ActivityTracker, IdleSettings } from '../lib/activity.ts';

/** How often to check whether a running remote has gone idle. */
const CHECK_MS = 200;

export interface RemoteActivity {
  activity: Activity;
  tracker: ActivityTracker;
}

/**
 * What someone is doing with the remote, reported through `onActivity` whenever it changes:
 * `arrived` until `started`, then `active` or `idle` from what's fed to the returned tracker. Also
 * returns the activity now.
 * `idle` overrides DEFAULT_IDLE, read once on mount.
 */
export function useActivity(
  started: boolean,
  onActivity: ((activity: Activity) => void) | undefined,
  idle: Partial<IdleSettings> = {},
): RemoteActivity {
  const [tracker] = useState(() => createActivityTracker({ ...DEFAULT_IDLE, ...idle }));
  const [running, setRunning] = useState<Exclude<Activity, 'arrived'>>('idle');

  useInterval(() => setRunning(tracker.at(performance.now())), CHECK_MS, started);
  const activity: Activity = started ? running : 'arrived';
  useOnChange(activity, onActivity);

  return { activity, tracker };
}
