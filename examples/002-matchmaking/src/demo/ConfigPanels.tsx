import { Banner, Select, Surface, Switch } from '@cloudflare/kumo';
import type { Grouping } from '../matching/match.ts';
import type { MatchConfig } from '../room/protocol.ts';
import { CueSelect } from './CueSelect.tsx';

interface ConfigPanelsProps {
  config: MatchConfig;
  onConfig: (config: MatchConfig) => void;
  /** Why cues will repeat next round, or null. */
  warning: string | null;
}

/** Only `random` exists so far; the others are placeholders for what's planned. */
const ALGORITHMS = {
  random: 'Random',
  maxDiversity: { disabled: true, label: 'Perspective Diversity (Max)' },
  minDiversity: { disabled: true, label: 'Perspective Diversity (Min)' },
};
const GROUP_BY = { groupCount: 'Number of groups', groupSize: 'Group size' };

/** The choices for each way of grouping: sizes from 2, counts from 1. */
const NUMBERS: Record<Grouping['by'], Record<string, string>> = {
  groupCount: numberItems(1, 20),
  groupSize: numberItems(2, 10),
};

function numberItems(from: number, to: number): Record<string, string> {
  return Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [String(from + i), String(from + i)]));
}

function amountOf(grouping: Grouping): number {
  return grouping.by === 'groupSize' ? grouping.groupSize : grouping.groupCount;
}

function groupingOf(by: string, amount: number): Grouping | null {
  if (by === 'groupSize' && amount >= 2) {
    return { by, fit: 'smart', groupSize: amount };
  }
  return by === 'groupCount' && amount >= 1 ? { by, groupCount: amount } : null;
}

/** How the next round is matched and cued, and whether phones show the found count. Shows the room's config, and sends any change straight back. */
export function ConfigPanels({ config, onConfig, warning }: ConfigPanelsProps) {
  const setGrouping = (by: string, amount: number) => {
    const grouping = groupingOf(by, amount) ?? groupingOf(by, 3);
    if (grouping) {
      onConfig({ ...config, grouping });
    }
  };

  return (
    <Surface className="flex flex-col gap-3 rounded-lg p-5">
      <h2 className="text-lg font-semibold">Next round</h2>
      <Select className="w-full" items={ALGORITHMS} label="Matching algorithm" value={config.algorithm} />
      <Select
        className="w-full"
        items={GROUP_BY}
        label="Group by"
        onValueChange={(by) => typeof by === 'string' && setGrouping(by, amountOf(config.grouping))}
        value={config.grouping.by}
      />
      <Select
        className="w-full"
        items={NUMBERS[config.grouping.by]}
        // Fewer people make fewer groups, and leftovers make some groups bigger.
        label={config.grouping.by === 'groupSize' ? 'People per group (min)' : 'Groups (max)'}
        onValueChange={(amount) => setGrouping(config.grouping.by, Number(amount))}
        value={String(amountOf(config.grouping))}
      />
      <CueSelect onChange={(cue) => onConfig({ ...config, cue })} value={config.cue} />
      {warning && <Banner description={warning} variant="alert" />}
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
