import { Select } from '@cloudflare/kumo';
import { CUE_TYPE_IDS, CUE_TYPES, isCueTypeId, SENSE_NAMES } from '../cues/cueTypes.ts';
import type { CueSense, CueTypeId } from '../cues/cueTypes.ts';

/** A cue by name and how many groups it can tell apart: "Colour (12)". */
function labelOf(id: CueTypeId): string {
  const { name, maxDistinct } = CUE_TYPES[id];
  return `${name} (${Number.isFinite(maxDistinct) ? maxDistinct : 'no limit'})`;
}

/** Every cue, sorted by name, for the trigger's label. */
const ITEMS = CUE_TYPE_IDS.map((id) => ({ label: labelOf(id), value: id })).toSorted((a, b) => a.label.localeCompare(b.label));

const SENSES: ReadonlyArray<CueSense> = ['audio', 'visual', 'haptic'];

/** The cues under each sense, sorted by name within it. */
const BY_SENSE = SENSES.map((sense) => ({ items: ITEMS.filter(({ value }) => CUE_TYPES[value].sense === sense), sense }));

/** The cue for the next round, its choices grouped by sense: Audio, Visual, then Haptics. */
export function CueSelect({ value, onChange }: { value: CueTypeId; onChange: (cue: CueTypeId) => void }) {
  return (
    // `items` gives the trigger its label; the children lay the popup out in groups.
    <Select className="w-full" items={ITEMS} label="Cue (max groups)" onValueChange={(cue) => isCueTypeId(cue) && onChange(cue)} value={value}>
      {BY_SENSE.map(({ sense, items }) => (
        <Select.Group key={sense}>
          <Select.GroupLabel>{SENSE_NAMES[sense]}</Select.GroupLabel>
          {items.map(({ label, value: id }) => (
            <Select.Option key={id} value={id}>
              {label}
            </Select.Option>
          ))}
        </Select.Group>
      ))}
    </Select>
  );
}
