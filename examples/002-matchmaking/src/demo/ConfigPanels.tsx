import { Select, Surface, Switch } from '@cloudflare/kumo';
import type { MatchConfig } from '../room/protocol.ts';
import { CueSelect } from './CueSelect.tsx';

interface ConfigPanelsProps {
  config: MatchConfig;
  onConfig: (config: MatchConfig) => void;
}

/** Only `random` exists so far; the others are placeholders for what's planned. */
const ALGORITHMS = {
  random: 'Random',
  maxDiversity: { disabled: true, label: 'Perspective Diversity (Max)' },
  minDiversity: { disabled: true, label: 'Perspective Diversity (Min)' },
};

/**
 * How the next round is matched and cued, and whether phones show the found count. Shows the room's
 * config, and sends any change straight back. How the room divides is set on the emcee's
 * `GroupSegmentWizard`, not here.
 */
export function ConfigPanels({ config, onConfig }: ConfigPanelsProps) {
  return (
    <Surface className="flex flex-col gap-3 rounded-lg p-5">
      <h2 className="text-lg font-semibold">Next round</h2>
      <Select className="w-full" items={ALGORITHMS} label="Matching algorithm" value={config.algorithm} />
      <CueSelect onChange={(cue) => onConfig({ ...config, cue })} value={config.cue} />
      <p className="text-sm text-kumo-subtle">Changes made during a round apply to the next one.</p>
      {/* Unlike the rest, this shows on phones straight away. */}
      <Switch
        checked={config.showFoundCount}
        label="Display found count"
        onCheckedChange={(showFoundCount) => onConfig({ ...config, showFoundCount })}
      />
    </Surface>
  );
}
