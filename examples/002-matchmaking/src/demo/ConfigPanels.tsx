import { Banner, Select, Surface } from '@cloudflare/kumo';
import { isCueTypeId } from '../cues/cueTypes.ts';
import type { CueTypeId } from '../cues/cueTypes.ts';
import type { Grouping } from '../matching/match.ts';
import type { MatchConfig } from '../room/protocol.ts';

interface ConfigPanelsProps {
  config: MatchConfig;
  onConfig: (config: MatchConfig) => void;
  /** Why cues will repeat next round, or null. */
  warning: string | null;
}

const ALGORITHMS = { random: 'Random' };
const GROUP_BY = { count: 'Number of groups', size: 'Group size' };
const CUES: Record<CueTypeId, string> = { avatar: 'Avatar', colour: 'Colour' };

/** The choices for each way of grouping: sizes from 2, counts from 1. */
const NUMBERS: Record<Grouping['by'], Record<string, string>> = {
  count: numberItems(1, 20),
  size: numberItems(2, 10),
};

function numberItems(from: number, to: number): Record<string, string> {
  return Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [String(from + i), String(from + i)]));
}

function amountOf(grouping: Grouping): number {
  return grouping.by === 'size' ? grouping.size : grouping.count;
}

function groupingOf(by: string, amount: number): Grouping | null {
  if (by === 'size' && amount >= 2) {
    return { by, size: amount };
  }
  return by === 'count' && amount >= 1 ? { by, count: amount } : null;
}

/** How the next round is matched and cued. Shows the room's config, and sends any change straight back. */
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
      <Select className="w-full" items={ALGORITHMS} label="Algorithm" value={config.algorithm} />
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
        label={config.grouping.by === 'size' ? 'People per group' : 'Groups'}
        onValueChange={(amount) => setGrouping(config.grouping.by, Number(amount))}
        value={String(amountOf(config.grouping))}
      />
      <Select
        className="w-full"
        items={CUES}
        label="Cue"
        onValueChange={(cue) => isCueTypeId(cue) && onConfig({ ...config, cue })}
        value={config.cue}
      />
      {warning && <Banner description={warning} variant="alert" />}
      <p className="text-sm text-kumo-subtle">Changes made during a round apply to the next one.</p>
    </Surface>
  );
}
