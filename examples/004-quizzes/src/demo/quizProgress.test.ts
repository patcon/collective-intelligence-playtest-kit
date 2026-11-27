import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../room/quizConfig.ts';
import type { ParticipantStatus, RoomSnapshot } from '../room/protocol.ts';
import { progressLine, startBlocker } from './quizProgress.ts';

function snapshotWith(phase: RoomSnapshot['phase'], ...people: Array<[ParticipantStatus, boolean]>): RoomSnapshot {
  return {
    config: DEFAULT_CONFIG,
    participants: people.map(([status, connected], i) => ({ answers: {}, connected, id: `p${i}`, status })),
    phase,
    statements: phase === 'quiz' ? ['EXT1', 'AGR1'] : [],
  };
}

describe('startBlocker', () => {
  it('blocks Start until someone connected is ready, and once the quiz has started', () => {
    expect(startBlocker(snapshotWith('lobby', ['joined', true]))).toBe('No one is ready yet.');
    expect(startBlocker(snapshotWith('lobby', ['joined', true], ['waiting', true]))).toBeNull();
    expect(startBlocker(snapshotWith('quiz', ['answering', true]))).not.toBeNull();
  });
});

describe('progressLine', () => {
  it('counts only those connected', () => {
    expect(progressLine(snapshotWith('quiz', ['answering', true], ['done', true], ['answering', false]))).toBe(
      'Quiz of 2 · 1 answering · 1 done · 0 waiting for the next',
    );
  });
});
