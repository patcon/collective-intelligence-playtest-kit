import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ParticipantView } from '../room/protocol.ts';
import { SimulatedParticipant } from './SimulatedParticipant.ts';
import type { ConnectSim } from './SimulatedParticipant.ts';

const DELAY = 3000;
const red = { hex: '#e6194b', name: 'Red', type: 'colour' } as const;
const matched: ParticipantView = { cue: red, group: { found: 0, size: 2 }, status: 'matched' };

/** A sim on a fake socket: `open()` and `view()` play the room's part, `sent` is what the sim said. */
function simulated(autoConfirm = true) {
  const sent: Array<unknown> = [];
  let handlers: Parameters<ConnectSim>[1] | null = null;
  const close = vi.fn();
  const connect: ConnectSim = (_id, h) => {
    handlers = h;
    return { close, send: (text) => sent.push(JSON.parse(text)) };
  };
  const sim = new SimulatedParticipant({ autoConfirm, connect, delay: () => DELAY, id: 'sim-1' });
  return {
    close,
    open: () => handlers?.onOpen(),
    sent,
    sim,
    view: (view: ParticipantView) => handlers?.onMessage(JSON.stringify({ nextCue: 'colour', type: 'view', view })),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SimulatedParticipant', () => {
  it('says it is ready each time its socket opens', () => {
    const { open, sent } = simulated();
    open();
    open();
    expect(sent).toEqual([{ type: 'ready' }, { type: 'ready' }]);
  });

  it('taps found once, after the delay, when matched with auto-confirm on', () => {
    const { sent, view } = simulated();
    view(matched);
    view(matched);
    vi.advanceTimersByTime(DELAY - 1);
    expect(sent).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(sent).toEqual([{ found: true, type: 'found' }]);
  });

  it('forgets a pending tap when the round ends first', () => {
    const { sent, view } = simulated();
    view(matched);
    view({ status: 'waiting' });
    vi.advanceTimersByTime(DELAY);
    expect(sent).toEqual([]);
  });

  it('waits for a manual tap with auto-confirm off, and starts the delay when it is turned on', () => {
    const { sent, sim, view } = simulated(false);
    view(matched);
    vi.advanceTimersByTime(DELAY);
    expect(sent).toEqual([]);
    sim.setAutoConfirm(true);
    vi.advanceTimersByTime(DELAY);
    expect(sent).toEqual([{ found: true, type: 'found' }]);
  });

  it('closes its socket and drops a pending tap when disposed', () => {
    const { close, sent, sim, view } = simulated();
    view(matched);
    sim.dispose();
    vi.advanceTimersByTime(DELAY);
    expect(close).toHaveBeenCalledOnce();
    expect(sent).toEqual([]);
  });
});
