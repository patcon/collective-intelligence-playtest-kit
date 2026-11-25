import { describe, expect, it } from 'vitest';
import { flipInstruction } from './instructions.ts';

describe('flipInstruction', () => {
  it('says +1 and −1 without labels', () => {
    expect(flipInstruction(null)).toBe('Face up for +1, face down for −1');
  });

  it('uses the ends of the axis labels, ignoring the middle', () => {
    expect(flipInstruction({ negative: 'disagree', neutral: 'pass', positive: 'agree' })).toBe(
      'Face up for agree, face down for disagree',
    );
  });
});
