import type { ConnectSim } from '@playtest-kit/common/simulation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ItemId } from '../items/items.ts';
import type { ParticipantView } from '../room/protocol.ts';
import { QuizSim } from './QuizSim.ts';
import type { Person } from './responses.ts';

const DELAY = 4000;
const STATEMENTS: Array<ItemId> = ['EXT1', 'AGR1', 'CSN1'];
const person: Person = { answers: { AGR1: null, CSN1: 2, EXT1: 5 }, country: 'CA', row: 7, skipped: 1 };

/** A sim on a fake socket: `open()` and `at()` play the room's part, `sent` is what the sim said. */
function simulated() {
  const sent: Array<unknown> = [];
  let handlers: Parameters<ConnectSim>[1] | null = null;
  const close = vi.fn();
  const connect: ConnectSim = (_id, h) => {
    handlers = h;
    return { close, send: (text) => sent.push(JSON.parse(text)) };
  };
  const sim = new QuizSim({ connect, delay: () => DELAY, id: 'sim-1', person });
  const view = (v: ParticipantView) => handlers?.onMessage(JSON.stringify({ type: 'view', view: v }));
  const at = (position: number) => view({ answers: {}, position, statements: STATEMENTS, status: position < STATEMENTS.length ? 'answering' : 'done' });
  return { at, close, open: () => handlers?.onOpen(), sent, sim, view };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('QuizSim', () => {
  it('says it is ready each time its socket opens', () => {
    const { open, sent } = simulated();
    open();
    open();
    expect(sent).toEqual([{ type: 'ready' }, { type: 'ready' }]);
  });

  it('answers its person’s real answers in order, skipping where they skipped, after the delay', () => {
    const { at, sent } = simulated();
    for (let position = 0; position <= STATEMENTS.length; position++) {
      at(position);
      at(position);
      vi.advanceTimersByTime(DELAY - 1);
      expect(sent).toHaveLength(position);
      vi.advanceTimersByTime(1);
    }
    expect(sent).toEqual([
      { answer: 5, item: 'EXT1', type: 'answer' },
      { answer: null, item: 'AGR1', type: 'answer' },
      { answer: 2, item: 'CSN1', type: 'answer' },
    ]);
  });

  it('fast-forwards: every answer left, in order, then nothing more as the room catches up', () => {
    const { at, sent, sim } = simulated();
    at(0);
    vi.advanceTimersByTime(DELAY);
    at(1);
    sim.finish();
    expect(sent).toEqual([
      { answer: 5, item: 'EXT1', type: 'answer' },
      { answer: null, item: 'AGR1', type: 'answer' },
      { answer: 2, item: 'CSN1', type: 'answer' },
    ]);
    at(2);
    at(3);
    vi.advanceTimersByTime(DELAY * 10);
    expect(sent).toHaveLength(3);
  });

  it('drops a pending answer when the quiz is reset, and never undoes', () => {
    const { at, sent, view } = simulated();
    at(0);
    view({ answers: {}, position: 0, statements: [], status: 'waiting' });
    vi.advanceTimersByTime(DELAY * 10);
    expect(sent).toEqual([]);
  });

  it('closes its socket and drops a pending answer when disposed', () => {
    const { at, close, sent, sim } = simulated();
    at(0);
    sim.dispose();
    vi.advanceTimersByTime(DELAY);
    expect(close).toHaveBeenCalledOnce();
    expect(sent).toEqual([]);
  });
});
