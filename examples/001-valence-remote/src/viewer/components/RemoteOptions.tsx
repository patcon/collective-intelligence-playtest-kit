import { Select, Switch } from '@cloudflare/kumo';
import type { RemoteSettings } from '../../room/remoteSettings.ts';
import {
  AXIS_LABEL_PRESET_IDS,
  AXIS_LABEL_PRESETS,
  axisLabelsPresetOf,
  axisLabelsToList,
  isAxisLabelsPreset,
} from '../../ValenceRemote/lib/axisLabels.ts';
import { DETECTION_LABELS } from '../../ValenceRemote/lib/instructions.ts';
import { levelsFromParam, levelsToParam } from '../../ValenceRemote/lib/levels.ts';
import { isDetection } from '../../ValenceRemote/lib/valence.ts';
import type { RemoteSettingsControl } from '../hooks/useRemoteSettings.ts';

/** The remote's URL with `settings` as query parameters. */
export function remoteUrl(origin: string, settings: RemoteSettings): string {
  const { detection, tintWhenIdle, showNumeric, allowSelection, axisLabels, levels } = settings;
  const params = new URLSearchParams({ detection, levels: levelsToParam(levels) });
  for (const label of axisLabels ? axisLabelsToList(axisLabels) : []) {
    params.append('label', label);
  }
  if (!tintWhenIdle) {
    params.set('tintWhenIdle', '0');
  }
  if (showNumeric) {
    params.set('showNumeric', '1');
  }
  if (allowSelection) {
    params.set('allowSelection', '1');
  }
  return `${origin}/remote?${params}`;
}

const NO_LABELS = 'none';

/** The resolutions on offer, keyed by their URL parameter. */
const LEVEL_ITEMS = {
  '2': '−1 or +1',
  '3': '−1, 0 or +1',
  '5': 'Steps of 0.5',
  '21': 'Steps of 0.1',
  '201': 'Steps of 0.01',
  full: 'Full precision',
};

/** Each preset, shown high to low, and none. */
const AXIS_LABEL_ITEMS = {
  [NO_LABELS]: 'None',
  ...Object.fromEntries(
    AXIS_LABEL_PRESET_IDS.map((id) => [id, axisLabelsToList(AXIS_LABEL_PRESETS[id]).toReversed().join(' / ')]),
  ),
};

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
      <Select
        className="w-full"
        items={AXIS_LABEL_ITEMS}
        label="Axis labels"
        onValueChange={(id) =>
          setSettings({ ...settings, axisLabels: isAxisLabelsPreset(id) ? AXIS_LABEL_PRESETS[id] : null })
        }
        value={axisLabelsPresetOf(settings.axisLabels) ?? NO_LABELS}
      />
      <Select
        className="w-full"
        items={LEVEL_ITEMS}
        label="Resolution"
        onValueChange={(param) => {
          const levels = levelsFromParam(param);
          if (levels !== undefined) {
            setSettings({ ...settings, levels });
          }
        }}
        value={levelsToParam(settings.levels)}
      />
      <Switch
        checked={settings.tintWhenIdle}
        label="Tint when idle"
        onCheckedChange={(tintWhenIdle) => setSettings({ ...settings, tintWhenIdle })}
      />
      <Switch
        checked={settings.showNumeric}
        label="Show numbers on phones"
        onCheckedChange={(showNumeric) => setSettings({ ...settings, showNumeric })}
      />
      <Switch
        checked={settings.allowSelection}
        label="Allow selection on phones"
        onCheckedChange={(allowSelection) => setSettings({ ...settings, allowSelection })}
      />
    </div>
  );
}
