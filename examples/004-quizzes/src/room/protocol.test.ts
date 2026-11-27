import { describe, expect, it } from 'vitest';
import { parseHostMessage, parseParticipantMessage, parseToHost, parseToParticipant } from './protocol.ts';

const json = (value: unknown) => JSON.stringify(value);

describe('parseParticipantMessage', () => {
  it('reads ready, undo, answers and skips', () => {
    expect(parseParticipantMessage(json({ type: 'ready' }))).toEqual({ type: 'ready' });
    expect(parseParticipantMessage(json({ type: 'undo' }))).toEqual({ type: 'undo' });
    expect(parseParticipantMessage(json({ answer: 5, item: 'OPN10', type: 'answer' }))).toEqual({ answer: 5, item: 'OPN10', type: 'answer' });
    expect(parseParticipantMessage(json({ answer: null, item: 'EXT1', type: 'answer' }))).toEqual({ answer: null, item: 'EXT1', type: 'answer' });
  });

  it('rejects unknown types, unknown statements, and answers outside 1–5', () => {
    expect(parseParticipantMessage(json({ type: 'found' }))).toBeNull();
    expect(parseParticipantMessage(json({ answer: 3, item: 'EXT11', type: 'answer' }))).toBeNull();
    for (const answer of [0, 6, 2.5, '3', undefined]) {
      expect(parseParticipantMessage(json({ answer, item: 'EXT1', type: 'answer' }))).toBeNull();
    }
    expect(parseParticipantMessage('not json')).toBeNull();
  });
});

describe('parseHostMessage', () => {
  it('reads start, reset and config', () => {
    expect(parseHostMessage(json({ type: 'start' }))).toEqual({ type: 'start' });
    expect(parseHostMessage(json({ type: 'reset' }))).toEqual({ type: 'reset' });
    const config = { latecomers: 'join', statementCount: 10 };
    expect(parseHostMessage(json({ config, type: 'config' }))).toEqual({ config, type: 'config' });
  });

  it('rejects N outside 1–50 and unknown latecomers', () => {
    for (const statementCount of [0, 51, 2.5]) {
      expect(parseHostMessage(json({ config: { latecomers: 'wait', statementCount }, type: 'config' }))).toBeNull();
    }
    expect(parseHostMessage(json({ config: { latecomers: 'never', statementCount: 5 }, type: 'config' }))).toBeNull();
    expect(parseHostMessage(json({ type: 'answer' }))).toBeNull();
  });
});

describe('parseToParticipant and parseToHost', () => {
  it('read views and snapshots, and reject unknown statements in them', () => {
    const view = { answers: { EXT1: 2 }, position: 1, statements: ['EXT1', 'AGR1'], status: 'answering' };
    expect(parseToParticipant(json({ type: 'view', view }))).toEqual({ type: 'view', view });
    expect(parseToParticipant(json({ type: 'view', view: { ...view, answers: { EXT0: 2 } } }))).toBeNull();
    const snapshot = { config: { latecomers: 'wait', statementCount: 2 }, participants: [{ answers: { EXT1: null }, connected: true, id: 'a', status: 'answering' }], phase: 'quiz', statements: ['EXT1', 'AGR1'] };
    expect(parseToHost(json({ snapshot, type: 'snapshot' }))).toEqual({ snapshot, type: 'snapshot' });
    expect(parseToHost(json({ snapshot: { ...snapshot, phase: 'round' }, type: 'snapshot' }))).toBeNull();
  });
});
