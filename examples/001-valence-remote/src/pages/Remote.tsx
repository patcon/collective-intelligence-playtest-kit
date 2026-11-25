import { useState } from 'react';
import { useRoomMessages } from '../hooks/effects/useRoomMessages.ts';
import { useSendOnOpen } from '../hooks/effects/useSendOnOpen.ts';
import { RoomProvider, useRoomStatus } from '../room/RoomProvider.tsx';
import type { RemoteSettings } from '../room/remoteSettings.ts';
import { RoomStatusBadge } from '../room/RoomStatusBadge.tsx';
import { isBarVariant } from '../ValenceRemote/components/BarTracks.tsx';
import { isBarPosition } from '../ValenceRemote/components/ValenceBar.tsx';
import { ValenceRemote } from '../ValenceRemote/ValenceRemote.tsx';
import { axisLabelsFromList } from '../ValenceRemote/lib/axisLabels.ts';
import type { Activity, IdleSettings } from '../ValenceRemote/lib/activity.ts';
import { DEFAULT_LEVELS, levelsFromParam } from '../ValenceRemote/lib/levels.ts';
import type { Valence } from '../ValenceRemote/lib/sender.ts';
import { isDetection } from '../ValenceRemote/lib/valence.ts';
import type { Detection } from '../ValenceRemote/lib/valence.ts';

function settingsFromUrl(): RemoteSettings {
  const params = new URLSearchParams(window.location.search);
  const detection = params.get('detection');
  return {
    allowSelection: params.has('allowSelection'),
    axisLabels: axisLabelsFromList(params.getAll('label')),
    detection: isDetection(detection) ? detection : 'flip',
    levels: levelsFromParam(params.get('levels')) ?? DEFAULT_LEVELS,
    showNumeric: params.has('showNumeric'),
    tintWhenIdle: params.get('tintWhenIdle') !== '0',
  };
}

/** The holder's own pick while selection is allowed, otherwise the room's (or URL's) detection. */
function detectionFor({ allowSelection, detection }: RemoteSettings, picked: Detection | null): Detection {
  return allowSelection && picked !== null ? picked : detection;
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

function barFromUrl() {
  const bar = new URLSearchParams(window.location.search).get('bar');
  return isBarPosition(bar) ? bar : undefined;
}

function barVariantFromUrl() {
  const variant = new URLSearchParams(window.location.search).get('barVariant');
  return isBarVariant(variant) ? variant : undefined;
}

function ConnectedRemote() {
  // Holders can take the connection for granted, so the badge only shows when it isn't open.
  const connected = useRoomStatus() === 'open';
  const [activity, setActivity] = useState<Activity | null>(null);
  const [roomSettings, setRoomSettings] = useState<RemoteSettings | null>(null);
  const [picked, setPicked] = useState<Detection | null>(null);
  // Undefined until the first reading; the room only hears a valence when it changes, so it's sent again on reconnect.
  const [valence, setValence] = useState<Valence | undefined>(undefined);
  useSendOnOpen(activity && { activity, type: 'activity' });
  useSendOnOpen(valence === undefined ? null : { type: 'valence', v: valence });
  useRoomMessages((msg) => msg.type === 'settings' && setRoomSettings(msg.settings));
  const settings = roomSettings ?? settingsFromUrl();
  const detection = detectionFor(settings, picked);

  return (
    <ValenceRemote
      badges={connected ? null : <RoomStatusBadge />}
      axisLabels={settings.axisLabels}
      barPosition={barFromUrl()}
      barVariant={barVariantFromUrl()}
      detection={detection}
      onPickDetection={settings.allowSelection ? setPicked : undefined}
      showNumeric={settings.showNumeric}
      tintWhenIdle={settings.tintWhenIdle}
      idle={idleFromUrl()}
      onActivity={setActivity}
      levels={settings.levels}
      onValence={setValence}
    />
  );
}

/**
 * `/remote`: this device as a phone in the room. `?detection=` picks the mode (default `flip`);
 * `?idleMs=` and `?stillDeg=` override when it counts as idle (see DEFAULT_IDLE); `?tintWhenIdle=0`
 * stops tinting the screen while idle; `?bar=left` runs the valence bar up the left edge rather
 * than along the top; `?barVariant=` picks how the bar shows the raw reading against the level sent
 * (`double`, the default; `overlay`; or `continuous`); `?label=`, given two or three times from low to high, labels the bar's ends
 * (and middle); `?levels=` sets how finely valence is sent (a count of evenly spaced values from
 * −1 to +1, such as 3 for −1, 0 and +1, or `full` for full precision; steps of 0.01 by default); `?showNumeric` shows the valence as a number; `?allowSelection` shows a badge on
 * the running screen that cycles through the modes. Once a viewer sets the room's settings, they
 * override all but `bar`, `barVariant` and the idle timings, live. While selection is allowed, the holder's pick
 * overrides the detection.
 */
export function Remote({ room }: { room: string }) {
  return (
    <RoomProvider role="phone" room={room}>
      <ConnectedRemote />
    </RoomProvider>
  );
}
