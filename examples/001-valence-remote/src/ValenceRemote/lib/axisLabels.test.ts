import { describe, expect, it } from 'vitest';
import {
  AXIS_LABEL_PRESET_IDS,
  AXIS_LABEL_PRESETS,
  axisLabelsFromList,
  axisLabelsPresetOf,
  axisLabelsToList,
  isAxisLabels,
} from './axisLabels.ts';

describe('axis label lists', () => {
  it('round-trips every preset, low to high', () => {
    for (const id of AXIS_LABEL_PRESET_IDS) {
      expect(axisLabelsFromList(axisLabelsToList(AXIS_LABEL_PRESETS[id]))).toEqual(AXIS_LABEL_PRESETS[id]);
    }
    expect(axisLabelsToList(AXIS_LABEL_PRESETS['agree-disagree'])).toEqual(['disagree', 'pass', 'agree']);
  });

  it('reads two labels as the ends', () => {
    expect(axisLabelsFromList(['neg', 'pos'])).toEqual({ negative: 'neg', positive: 'pos' });
  });

  it.each([[[]], [['one']], [['a', 'b', 'c', 'd']], [['a', '', 'c']]])('reads %j as none', (list) => {
    expect(axisLabelsFromList(list)).toBeNull();
  });
});

describe('isAxisLabels', () => {
  it('needs both ends, and allows a middle', () => {
    expect(isAxisLabels({ negative: 'no', positive: 'yes' })).toBe(true);
    expect(isAxisLabels({ negative: 'no', neutral: 'meh', positive: 'yes' })).toBe(true);
    expect(isAxisLabels({ positive: 'yes' })).toBe(false);
    expect(isAxisLabels({ negative: 'no', neutral: 3, positive: 'yes' })).toBe(false);
  });
});

describe('axisLabelsPresetOf', () => {
  it('finds the matching preset, or none for custom labels', () => {
    expect(axisLabelsPresetOf({ negative: 'whack', neutral: 'mid', positive: 'based' })).toBe('based-whack');
    expect(axisLabelsPresetOf({ negative: 'whack', positive: 'based' })).toBeNull();
    expect(axisLabelsPresetOf(null)).toBeNull();
  });
});
