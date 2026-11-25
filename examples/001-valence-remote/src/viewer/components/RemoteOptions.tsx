import { Select, Switch } from '@cloudflare/kumo';
import type { RemoteSettings } from '../../room/remoteSettings.ts';
import { DETECTION_LABELS } from '../../ValenceRemote/lib/instructions.ts';
import { isDetection } from '../../ValenceRemote/lib/valence.ts';
import type { RemoteSettingsControl } from '../hooks/useRemoteSettings.ts';

/** The remote's URL with `settings` as query parameters. */
export function remoteUrl(origin: string, { detection, tintWhenIdle, allowSelection }: RemoteSettings): string {
  const params = new URLSearchParams({ detection });
  if (tintWhenIdle) {
    params.set('tintWhenIdle', '1');
  }
  if (allowSelection) {
    params.set('allowSelection', '1');
  }
  return `${origin}/remote?${params}`;
}

/** Pickers for the settings every phone runs with, which the QR code carries too. */
export function RemoteOptions({ settings, setSettings }: RemoteSettingsControl) {
  return (
    <div className="flex w-full flex-col gap-3">
      <Select
        className="w-full"
        items={DETECTION_LABELS}
        label="Detection"
        onValueChange={(detection) => isDetection(detection) && setSettings({ ...settings, detection })}
        value={settings.detection}
      />
      <Switch
        checked={settings.tintWhenIdle}
        label="Tint when idle"
        onCheckedChange={(tintWhenIdle) => setSettings({ ...settings, tintWhenIdle })}
      />
      <Switch
        checked={settings.allowSelection}
        label="Allow selection on phones"
        onCheckedChange={(allowSelection) => setSettings({ ...settings, allowSelection })}
      />
    </div>
  );
}
