import { useState } from 'react';
import { useRoomMessages } from '../../hooks/effects/useRoomMessages.ts';
import { useRoomSend } from '../../room/RoomProvider.tsx';
import { DEFAULT_REMOTE_SETTINGS } from '../../room/remoteSettings.ts';
import type { RemoteSettings } from '../../room/remoteSettings.ts';

export interface RemoteSettingsControl {
  settings: RemoteSettings;
  /** Whether connected phones run with `settings`, rather than with their own (from their URL). */
  pushed: boolean;
  setSettings: (settings: RemoteSettings) => void;
  setPushed: (pushed: boolean) => void;
}

/**
 * The settings phones joining from the QR code will run with, and whether they're also pushed to
 * phones already connected. While pushed, every change goes to the room too. Follows the room's
 * settings as it sends them (on connecting, and as any viewer changes them), so viewers agree.
 */
export function useRemoteSettings(): RemoteSettingsControl {
  const send = useRoomSend();
  const [settings, setLocal] = useState<RemoteSettings>(DEFAULT_REMOTE_SETTINGS);
  const [pushed, setPushedLocal] = useState(false);

  useRoomMessages((msg) => {
    if (msg.type === 'settings') {
      setPushedLocal(msg.settings !== null);
      if (msg.settings) {
        setLocal(msg.settings);
      }
    }
  });

  const setSettings = (next: RemoteSettings) => {
    setLocal(next);
    if (pushed) {
      send({ settings: next, type: 'settings' });
    }
  };

  const setPushed = (next: boolean) => {
    setPushedLocal(next);
    send({ settings: next ? settings : null, type: 'settings' });
  };

  return { pushed, setPushed, setSettings, settings };
}
