import { Select, Switch } from '@cloudflare/kumo';
import { isDetection } from '../../ValenceRemote/lib/valence.ts';
import type { Detection } from '../../ValenceRemote/lib/valence.ts';

const DETECTION_LABELS: Record<Detection, string> = {
  flip: 'Flip (face up / down)',
  invert: 'Invert (upright / upside down)',
  spin: 'Spin (steering wheel)',
  touch: 'Touch (finger height)',
};

/** How phones joining from the QR code will run the remote. */
export interface RemoteSettings {
  detection: Detection;
  tintWhenIdle: boolean;
}

/** The remote's URL with `settings` as query parameters. */
export function remoteUrl(origin: string, { detection, tintWhenIdle }: RemoteSettings): string {
  const params = new URLSearchParams({ detection });
  if (tintWhenIdle) {
    params.set('tintWhenIdle', '1');
  }
  return `${origin}/remote?${params}`;
}

interface RemoteOptionsProps {
  value: RemoteSettings;
  onChange: (value: RemoteSettings) => void;
}

/** Pickers for the remote's settings, for the QR code to carry. */
export function RemoteOptions({ value, onChange }: RemoteOptionsProps) {
  return (
    <div className="flex w-full flex-col gap-3">
      <Select
        className="w-full"
        items={DETECTION_LABELS}
        label="Detection"
        onValueChange={(detection) => isDetection(detection) && onChange({ ...value, detection })}
        value={value.detection}
      />
      <Switch
        checked={value.tintWhenIdle}
        label="Tint when idle"
        onCheckedChange={(tintWhenIdle) => onChange({ ...value, tintWhenIdle })}
      />
    </div>
  );
}
