import { useState } from 'react';
import { useRoomMessages } from '../hooks/effects/useRoomMessages.ts';
import { useSendOnOpen } from '../hooks/effects/useSendOnOpen.ts';
import { RoomProvider, useRoomSend, useRoomStatus } from '../room/RoomProvider.tsx';
import type { RemoteSettings } from '../room/remoteSettings.ts';
import { RoomStatusBadge } from '../room/RoomStatusBadge.tsx';
import { ValenceRemote } from '../ValenceRemote/ValenceRemote.tsx';
import type { Activity, IdleSettings } from '../ValenceRemote/lib/activity.ts';
import { isDetection } from '../ValenceRemote/lib/valence.ts';

function settingsFromUrl(): RemoteSettings {
  const params = new URLSearchParams(window.location.search);
  const detection = params.get('detection');
  return { detection: isDetection(detection) ? detection : 'flip', tintWhenIdle: params.has('tintWhenIdle') };
}

/** A positive number from the URL, or undefined to keep the default. */
function positiveParam(name: string): number | undefined {
  const value = Number(new URLSearchParams(window.location.search).get(name) ?? Number.NaN);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function idleFromUrl(): Partial<IdleSettings> {
  const settings: Partial<IdleSettings> = {};
  const idleMs = positiveParam('idleMs');
  const stillDeg = positiveParam('stillDeg');
  if (idleMs !== undefined) {
    settings.idleMs = idleMs;
  }
  if (stillDeg !== undefined) {
    settings.stillDeg = stillDeg;
  }
  return settings;
}

function ConnectedRemote() {
  const send = useRoomSend();
  // Holders can take the connection for granted, so the badge only shows when it isn't open.
  const connected = useRoomStatus() === 'open';
  const [activity, setActivity] = useState<Activity | null>(null);
  const [pushed, setPushed] = useState<RemoteSettings | null>(null);
  useSendOnOpen(activity && { activity, type: 'activity' });
  useRoomMessages((msg) => msg.type === 'settings' && setPushed(msg.settings));
  const { detection, tintWhenIdle } = pushed ?? settingsFromUrl();

  return (
    <ValenceRemote
      badges={connected ? null : <RoomStatusBadge />}
      detection={detection}
      // Switching to or from touch starts over at the start screen, whose tap tilt needs to ask for motion access.
      key={detection === 'touch' ? 'touch' : 'tilt'}
      tintWhenIdle={tintWhenIdle}
      idle={idleFromUrl()}
      onActivity={setActivity}
      onValence={(v) => send({ type: 'valence', v })}
    />
  );
}

/**
 * `/remote`: this device as a phone in the room. `?detection=` picks the mode (default `flip`);
 * `?idleMs=` and `?stillDeg=` override when it counts as idle (see DEFAULT_IDLE); `?tintWhenIdle`
 * tints the screen while idle. Settings a viewer pushes to the room override `detection` and
 * `tintWhenIdle`, live, until it stops pushing them.
 */
export function Remote({ room }: { room: string }) {
  return (
    <RoomProvider role="phone" room={room}>
      <ConnectedRemote />
    </RoomProvider>
  );
}
