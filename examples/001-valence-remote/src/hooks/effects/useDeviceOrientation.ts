import { useEffect, useEffectEvent, useState } from 'react';

/**
 * Where reading orientation stands:
 * - `needs-permission`: iOS, until a tap grants it;
 * - `denied`: refused;
 * - `insecure`: an HTTP page, where browsers block orientation;
 * - `unsupported`: no orientation API;
 * - `waiting`: listening, nothing heard yet;
 * - `no-signal`: nothing heard within NO_SIGNAL_MS;
 * - `live`: readings arriving.
 */
export type OrientationStatus =
  | 'needs-permission'
  | 'denied'
  | 'insecure'
  | 'unsupported'
  | 'waiting'
  | 'no-signal'
  | 'live';

export const NO_SIGNAL_MS = 2500;

type Permission = 'unknown' | 'granted' | 'denied';

type OrientationWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

function orientationApi(): OrientationWithPermission | undefined {
  return typeof window === 'undefined' ? undefined : window.DeviceOrientationEvent;
}

function blockedStatus(permission: Permission): OrientationStatus | null {
  if (!window.isSecureContext) {
    return 'insecure';
  }
  const api = orientationApi();
  if (!api) {
    return 'unsupported';
  }
  if (permission === 'denied') {
    return 'denied';
  }
  const needsAsk = typeof api.requestPermission === 'function';
  return needsAsk && permission !== 'granted' ? 'needs-permission' : null;
}

/**
 * Listens to `deviceorientation` while `enabled`, calling `onOrientation(beta, gamma)` for each reading.
 * Call `requestPermission` from a tap: iOS only asks from a user gesture.
 */
export function useDeviceOrientation(
  enabled: boolean,
  onOrientation: (beta: number, gamma: number) => void,
) {
  const [permission, setPermission] = useState<Permission>('unknown');
  const [heard, setHeard] = useState<'waiting' | 'no-signal' | 'live'>('waiting');
  const blocked = blockedStatus(permission);
  const listening = enabled && blocked === null;
  const onReading = useEffectEvent(onOrientation);

  useEffect(() => {
    if (!listening) {
      return;
    }
    let live = false;
    const handle = (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) {
        return;
      }
      if (!live) {
        live = true;
        setHeard('live');
      }
      onReading(event.beta, event.gamma);
    };
    window.addEventListener('deviceorientation', handle);
    const timer = setTimeout(() => !live && setHeard('no-signal'), NO_SIGNAL_MS);
    return () => {
      window.removeEventListener('deviceorientation', handle);
      clearTimeout(timer);
      setHeard('waiting');
    };
  }, [listening]);

  const requestPermission = async () => {
    const api = orientationApi();
    if (typeof api?.requestPermission !== 'function') {
      return;
    }
    try {
      setPermission((await api.requestPermission()) === 'granted' ? 'granted' : 'denied');
    } catch {
      setPermission('denied');
    }
  };

  const status: OrientationStatus = blocked ?? heard;
  return { requestPermission, status };
}
