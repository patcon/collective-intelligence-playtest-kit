import { isDetection } from '../ValenceRemote/lib/valence.ts';
import type { Detection } from '../ValenceRemote/lib/valence.ts';

/** How phones run the remote: as a viewer sets it for the room, or from a phone's URL until one does. */
export interface RemoteSettings {
  detection: Detection;
  tintWhenIdle: boolean;
  /** Let each phone's holder pick their own detection, over `detection`. */
  allowSelection: boolean;
}

export const DEFAULT_REMOTE_SETTINGS: RemoteSettings = { allowSelection: false, detection: 'flip', tintWhenIdle: false };

export function isRemoteSettings(value: unknown): value is RemoteSettings {
  return (
    typeof value === 'object' &&
    value !== null &&
    'detection' in value &&
    isDetection(value.detection) &&
    'tintWhenIdle' in value &&
    typeof value.tintWhenIdle === 'boolean' &&
    'allowSelection' in value &&
    typeof value.allowSelection === 'boolean'
  );
}
