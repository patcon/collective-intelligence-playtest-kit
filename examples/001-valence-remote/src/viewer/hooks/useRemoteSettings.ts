import { useState } from 'react';
import { useRoomMessages } from '../../hooks/effects/useRoomMessages.ts';
import { useRoomSend } from '../../room/RoomProvider.tsx';
import { DEFAULT_REMOTE_SETTINGS } from '../../room/remoteSettings.ts';
import type { RemoteSettings } from '../../room/remoteSettings.ts';

export interface RemoteSettingsControl {
  settings: RemoteSettings;
  setSettings: (settings: RemoteSettings) => void;
}

/**
 * The settings every phone in the room runs with, and the QR code carries. Each change goes to the
 * room. Follows the room's settings as it sends them (on connecting, and as any viewer changes
 * them), so viewers agree; when the room has none yet, gives it this viewer's.
 */
export function useRemoteSettings(): RemoteSettingsControl {
  const send = useRoomSend();
  const [settings, setLocal] = useState<RemoteSettings>(DEFAULT_REMOTE_SETTINGS);

  useRoomMessages((msg) => {
    if (msg.type !== 'settings') {
      return;
    }
    if (msg.settings) {
      setLocal(msg.settings);
    } else {
      send({ settings, type: 'settings' });
    }
  });

  const setSettings = (next: RemoteSettings) => {
    setLocal(next);
    send({ settings: next, type: 'settings' });
  };

  return { setSettings, settings };
}
