import { isDetection } from '../ValenceRemote/lib/valence.ts';
import type { Detection } from '../ValenceRemote/lib/valence.ts';

/** How a phone runs the remote: from its URL, or as a viewer pushed to the room. */
export interface RemoteSettings {
  detection: Detection;
  tintWhenIdle: boolean;
}

export const DEFAULT_REMOTE_SETTINGS: RemoteSettings = { detection: 'flip', tintWhenIdle: false };

export function isRemoteSettings(value: unknown): value is RemoteSettings {
  return (
    typeof value === 'object' &&
    value !== null &&
    'detection' in value &&
    isDetection(value.detection) &&
    'tintWhenIdle' in value &&
    typeof value.tintWhenIdle === 'boolean'
  );
}
