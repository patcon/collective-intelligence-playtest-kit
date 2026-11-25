import { Select, Switch } from '@cloudflare/kumo';
import type { RemoteSettings } from '../../room/remoteSettings.ts';
import { isDetection } from '../../ValenceRemote/lib/valence.ts';
import type { Detection } from '../../ValenceRemote/lib/valence.ts';
import type { RemoteSettingsControl } from '../hooks/useRemoteSettings.ts';

const DETECTION_LABELS: Record<Detection, string> = {
  flip: 'Flip (face up / down)',
  invert: 'Invert (upright / upside down)',
  spin: 'Spin (steering wheel)',
  touch: 'Touch (finger height)',
};

/** The remote's URL with `settings` as query parameters. */
export function remoteUrl(origin: string, { detection, tintWhenIdle }: RemoteSettings): string {
  const params = new URLSearchParams({ detection });
  if (tintWhenIdle) {
    params.set('tintWhenIdle', '1');
  }
  return `${origin}/remote?${params}`;
}

/** Pickers for the remote's settings, for the QR code to carry, and a switch to push them to connected phones. */
export function RemoteOptions({ settings, setSettings, pushed, setPushed }: RemoteSettingsControl) {
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
      <Switch checked={pushed} label="Apply to connected phones" onCheckedChange={setPushed} />
    </div>
  );
}
