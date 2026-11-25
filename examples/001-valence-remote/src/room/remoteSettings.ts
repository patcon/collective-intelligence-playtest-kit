import { isAxisLabels } from '../ValenceRemote/lib/axisLabels.ts';
import type { AxisLabels } from '../ValenceRemote/lib/axisLabels.ts';
import { DEFAULT_LEVELS, isLevels } from '../ValenceRemote/lib/levels.ts';
import type { Levels } from '../ValenceRemote/lib/levels.ts';
import { isDetection } from '../ValenceRemote/lib/valence.ts';
import type { Detection } from '../ValenceRemote/lib/valence.ts';

/** How phones run the remote: as a viewer sets it for the room, or from a phone's URL until one does. */
export interface RemoteSettings {
  detection: Detection;
  tintWhenIdle: boolean;
  /** Show the valence as a number, and touch mode's ends as +1 and −1. */
  showNumeric: boolean;
  /** Let each phone's holder pick their own detection, over `detection`. */
  allowSelection: boolean;
  /** Words along the valence bar's ends (and middle), or none. */
  axisLabels: AxisLabels | null;
  /** How finely phones send valence (see `Levels`). */
  levels: Levels;
}

export const DEFAULT_REMOTE_SETTINGS: RemoteSettings = {
  allowSelection: false,
  axisLabels: null,
  detection: 'flip',
  levels: DEFAULT_LEVELS,
  showNumeric: false,
  tintWhenIdle: true,
};

/** An object with the on/off settings, each a boolean. */
function hasFlags(value: unknown): value is Pick<RemoteSettings, 'tintWhenIdle' | 'showNumeric' | 'allowSelection'> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'tintWhenIdle' in value &&
    typeof value.tintWhenIdle === 'boolean' &&
    'showNumeric' in value &&
    typeof value.showNumeric === 'boolean' &&
    'allowSelection' in value &&
    typeof value.allowSelection === 'boolean'
  );
}

export function isRemoteSettings(value: unknown): value is RemoteSettings {
  return (
    hasFlags(value) &&
    'detection' in value &&
    isDetection(value.detection) &&
    'axisLabels' in value &&
    (value.axisLabels === null || isAxisLabels(value.axisLabels)) &&
    'levels' in value &&
    isLevels(value.levels)
  );
}
