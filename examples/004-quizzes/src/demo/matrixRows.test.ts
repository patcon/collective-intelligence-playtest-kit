import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../room/quizConfig.ts';
import type { RoomSnapshot } from '../room/protocol.ts';
import { cellClassOf } from './answerColours.ts';
import { matrixRows } from './matrixRows.ts';

const snapshot: RoomSnapshot = {
  config: DEFAULT_CONFIG,
  participants: ['sim-a', 'phone-x', 'sim-other', 'phone-y'].map((id) => ({ answers: {}, connected: true, id, status: 'answering' })),
  phase: 'quiz',
  statements: ['EXT1'],
};

describe('matrixRows', () => {
  it('puts phones first, then this page’s sims in its order, then other tabs’ sims', () => {
    const many: RoomSnapshot = { ...snapshot, participants: [...snapshot.participants, { answers: {}, connected: true, id: 'sim-b', status: 'answering' }] };
    const names = new Map([
      ['sim-b', 'Sim 1'],
      ['sim-a', 'Sim 2'],
    ]);
    expect(matrixRows(many, names).map((r) => r.name)).toEqual(['Phone 1', 'Phone 2', 'Sim 1', 'Sim 2', 'Other sim']);
  });
});

describe('cellClassOf', () => {
  it('tells answers, skips and blanks apart', () => {
    expect(cellClassOf(4)).toContain('vote-4');
    expect(cellClassOf(null)).toContain('vote-skip');
    expect(cellClassOf(undefined)).toContain('vote-blank');
  });
});
