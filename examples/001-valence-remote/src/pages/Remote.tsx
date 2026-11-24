import { useState } from 'react';
import { useSendOnOpen } from '../hooks/effects/useSendOnOpen.ts';
import { RoomProvider, useRoomSend } from '../room/RoomProvider.tsx';
import { ValenceRemote } from '../ValenceRemote/ValenceRemote.tsx';
import type { Activity, IdleSettings } from '../ValenceRemote/lib/activity.ts';
import { isDetection } from '../ValenceRemote/lib/valence.ts';

function detectionFromUrl() {
  const param = new URLSearchParams(window.location.search).get('detection');
  return isDetection(param) ? param : 'flip';
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
  const [activity, setActivity] = useState<Activity | null>(null);
  useSendOnOpen(activity && { activity, type: 'activity' });

  return (
    <ValenceRemote
      detection={detectionFromUrl()}
      tintWhenIdle={new URLSearchParams(window.location.search).has('tintWhenIdle')}
      idle={idleFromUrl()}
      onActivity={setActivity}
      onValence={(v) => send({ type: 'valence', v })}
    />
  );
}

/**
 * `/remote`: this device as a phone in the room. `?detection=` picks the mode (default `flip`);
 * `?idleMs=` and `?stillDeg=` override when it counts as idle (see DEFAULT_IDLE); `?tintWhenIdle`
 * tints the screen while idle.
 */
export function Remote({ room }: { room: string }) {
  return (
    <RoomProvider role="phone" room={room}>
      <ConnectedRemote />
    </RoomProvider>
  );
}
