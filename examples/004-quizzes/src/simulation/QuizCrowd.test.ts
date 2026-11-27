import type { ConnectSim } from '@playtest-kit/common/simulation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_SIMS, QuizCrowd } from './QuizCrowd.ts';
import { PEOPLE } from './responses.ts';
import type { Person } from './responses.ts';

const connect: ConnectSim = () => ({ close: () => undefined, send: () => undefined });
const person = (row: number, skipped: number): Person => ({ answers: {}, country: 'NONE', row, skipped });

describe('QuizCrowd', () => {
  it('stops at MAX_SIMS, each sim a different person', () => {
    const crowd = new QuizCrowd(connect, PEOPLE);
    crowd.setCount(MAX_SIMS + 10);
    const { sims } = crowd.getState();
    expect(sims).toHaveLength(MAX_SIMS);
    expect(new Set(sims.map((s) => s.person.row)).size).toBe(MAX_SIMS);
    crowd.dispose();
  });

  it('adds only people within the threshold, and says how many it fell short', () => {
    const crowd = new QuizCrowd(connect, [person(0, 0), person(1, 2), person(2, 0), person(3, 5)]);
    crowd.setMaxSkipped(0);
    crowd.setCount(3);
    expect(crowd.getState().sims.map((s) => s.person.skipped)).toEqual([0, 0]);
    expect(crowd.getState().short).toBe(1);
    crowd.setMaxSkipped(null);
    crowd.setCount(4);
    expect(crowd.getState()).toMatchObject({ short: 0 });
    expect(crowd.getState().sims).toHaveLength(4);
  });
});

describe('QuizCrowd speed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('divides each wait that starts after a change by the speed', () => {
    const sent: Array<unknown> = [];
    const listeners: Array<(raw: string) => void> = [];
    const talking: ConnectSim = (_id, handlers) => {
      listeners.push(handlers.onMessage);
      return { close: () => undefined, send: (text) => sent.push(JSON.parse(text)) };
    };
    const crowd = new QuizCrowd(talking, [person(0, 0)], () => 6000);
    crowd.setCount(1);
    crowd.setSpeed(20);
    listeners[0]?.(JSON.stringify({ type: 'view', view: { answers: {}, position: 0, statements: ['EXT1'], status: 'answering' } }));
    vi.advanceTimersByTime(299);
    expect(sent).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(sent).toEqual([{ answer: null, item: 'EXT1', type: 'answer' }]);
    expect(crowd.getState().speed).toBe(20);
  });
});
