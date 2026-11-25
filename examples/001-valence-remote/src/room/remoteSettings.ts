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
}

export const DEFAULT_REMOTE_SETTINGS: RemoteSettings = {
  allowSelection: false,
  detection: 'flip',
  showNumeric: false,
  tintWhenIdle: true,
};

export function isRemoteSettings(value: unknown): value is RemoteSettings {
  return (
    typeof value === 'object' &&
    value !== null &&
    'detection' in value &&
    isDetection(value.detection) &&
    'tintWhenIdle' in value &&
    typeof value.tintWhenIdle === 'boolean' &&
    'showNumeric' in value &&
    typeof value.showNumeric === 'boolean' &&
    'allowSelection' in value &&
    typeof value.allowSelection === 'boolean'
  );
}
