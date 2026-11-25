import { useState } from 'react';
import { useInterval, useOnChange } from '@playtest-kit/common';
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
 * returns the activity now. Tilt is checked every CHECK_MS; a touch or poke takes effect at once,
 * so the tap that starts the remote doesn't flash it idle first.
 * `idle` overrides DEFAULT_IDLE, read once on mount.
 */
export function useActivity(
  started: boolean,
  onActivity: ((activity: Activity) => void) | undefined,
  idle: Partial<IdleSettings> = {},
): RemoteActivity {
  const [tracker] = useState(() => createActivityTracker({ ...DEFAULT_IDLE, ...idle }));
  const [running, setRunning] = useState<Exclude<Activity, 'arrived'>>('idle');
  const check = () => setRunning(tracker.at(performance.now()));

  useInterval(check, CHECK_MS, started);
  const activity: Activity = started ? running : 'arrived';
  useOnChange(activity, onActivity);

  const checked: ActivityTracker = {
    ...tracker,
    poke(now) {
      tracker.poke(now);
      check();
    },
    touch(down) {
      tracker.touch(down);
      check();
    },
  };
  return { activity, tracker: checked };
}
