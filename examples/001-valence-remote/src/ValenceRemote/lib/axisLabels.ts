/** Words for the valence axis: its two ends, and optionally its middle (0). */
export interface AxisLabels {
  positive: string;
  neutral?: string;
  negative: string;
}

/** Ready-made labels for pickers, by id. */
export const AXIS_LABEL_PRESETS = {
  'agree-disagree': { negative: 'disagree', neutral: 'pass', positive: 'agree' },
  'attracted-repelled': { negative: 'repelled', neutral: 'baseline', positive: 'attracted' },
  'based-whack': { negative: 'whack', neutral: 'mid', positive: 'based' },
  'engaged-disengaged': { negative: 'disengaged', neutral: 'baseline', positive: 'engaged' },
  'plus-minus': { negative: '−', positive: '+' },
  'pos-neg': { negative: 'neg', positive: 'pos' },
  'positive-negative': { negative: 'negative', neutral: 'neutral', positive: 'positive' },
} as const satisfies Record<string, AxisLabels>;

export type AxisLabelsPreset = keyof typeof AXIS_LABEL_PRESETS;

function isLabel(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export const AXIS_LABEL_PRESET_IDS = Object.keys(AXIS_LABEL_PRESETS).filter(isAxisLabelsPreset);

export function isAxisLabelsPreset(value: unknown): value is AxisLabelsPreset {
  return typeof value === 'string' && Object.hasOwn(AXIS_LABEL_PRESETS, value);
}

export function isAxisLabels(value: unknown): value is AxisLabels {
  return (
    typeof value === 'object' &&
    value !== null &&
    'positive' in value &&
    isLabel(value.positive) &&
    'negative' in value &&
    isLabel(value.negative) &&
    (!('neutral' in value) || value.neutral === undefined || isLabel(value.neutral))
  );
}

/** The labels from low to high (negative, then any neutral, then positive), as a URL carries them. */
export function axisLabelsToList({ negative, neutral, positive }: AxisLabels): Array<string> {
  return neutral === undefined ? [negative, positive] : [negative, neutral, positive];
}

/** Labels from low to high: two for the ends, three with a middle; anything else is none. */
export function axisLabelsFromList(list: ReadonlyArray<string>): AxisLabels | null {
  const [negative, neutral, positive] = list.length === 2 ? [list[0], undefined, list[1]] : list;
  if (list.length > 3 || !isLabel(negative) || !isLabel(positive)) {
    return null;
  }
  if (neutral === undefined) {
    return { negative, positive };
  }
  return isLabel(neutral) ? { negative, neutral, positive } : null;
}

/** The preset these labels match, or null for none or custom ones. */
export function axisLabelsPresetOf(labels: AxisLabels | null): AxisLabelsPreset | null {
  if (labels === null) {
    return null;
  }
  const key = axisLabelsToList(labels).join('\n');
  return AXIS_LABEL_PRESET_IDS.find((id) => axisLabelsToList(AXIS_LABEL_PRESETS[id]).join('\n') === key) ?? null;
}
