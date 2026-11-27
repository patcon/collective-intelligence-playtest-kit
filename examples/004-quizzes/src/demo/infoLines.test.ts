import { describe, expect, it } from 'vitest';
import { personLine, statementLine } from './infoLines.ts';
import type { MatrixRow } from './matrixRows.ts';

const row = (kind: MatrixRow['kind'], name: string): MatrixRow => ({ answers: { AGR1: 2, EXT1: null }, connected: true, id: name, kind, name });

describe('statementLine', () => {
  it('shows the number, id, trait, keying and text', () => {
    expect(statementLine(['EXT1', 'AGR1'], 1)).toBe('#2 AGR1 · Agreeableness, reversed — “I feel little concern for others.”');
    expect(statementLine(['EXT1'], 0)).toBe('#1 EXT1 · Extraversion — “I am the life of the party.”');
    expect(statementLine(['EXT1'], 3)).toBeNull();
  });
});

describe('personLine', () => {
  it('shows a sim’s real data, and how far everyone has got', () => {
    const person = { answers: {}, country: 'CA', row: 48, skipped: 1 };
    expect(personLine(row('sim', 'Sim 12'), person, 10)).toBe('Sim 12 · sample row 48 · CA · skipped 1 of 50 in the real data · 2 / 10 answered');
    expect(personLine(row('phone', 'Phone 1'), undefined, 10)).toBe('Phone 1 · real phone · 2 / 10 answered');
    expect(personLine(row('sim', 'Other sim'), undefined, 10)).toContain('another tab');
  });
});
