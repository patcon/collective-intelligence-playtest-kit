import { describe, expect, it, vi } from 'vitest';
import { MAX_SIMS, SimulatedCrowd } from './SimulatedCrowd.ts';
import type { ConnectSim } from '@playtest-kit/common/simulation';

function crowdOnFakeSockets() {
  const close = vi.fn();
  const connect: ConnectSim = () => ({ close, send: () => undefined });
  return { close, crowd: new SimulatedCrowd(connect, () => 1000) };
}

describe('SimulatedCrowd', () => {
  it('adds sims up to the count, named by position, and no more than MAX_SIMS', () => {
    const { crowd } = crowdOnFakeSockets();
    crowd.setCount(3);
    expect(crowd.getState().sims.map((s) => s.name)).toEqual(['Sim 1', 'Sim 2', 'Sim 3']);
    crowd.setCount(MAX_SIMS + 5);
    expect(crowd.getState().sims).toHaveLength(MAX_SIMS);
  });

  it('removes the newest sims first, closing their sockets', () => {
    const { close, crowd } = crowdOnFakeSockets();
    crowd.setCount(3);
    const [first] = crowd.getState().sims;
    crowd.setCount(1);
    expect(crowd.getState().sims).toEqual([first]);
    expect(close).toHaveBeenCalledTimes(2);
  });

  it('tells subscribers about every change, with a new state each time', () => {
    const { crowd } = crowdOnFakeSockets();
    const listener = vi.fn();
    crowd.subscribe(listener);
    const before = crowd.getState();
    crowd.setAutoConfirm(false);
    expect(listener).toHaveBeenCalledOnce();
    expect(crowd.getState()).not.toBe(before);
    expect(crowd.getState().autoConfirm).toBe(false);
  });

  it('closes every sim when disposed', () => {
    const { close, crowd } = crowdOnFakeSockets();
    crowd.setCount(4);
    crowd.dispose();
    expect(close).toHaveBeenCalledTimes(4);
    expect(crowd.getState().sims).toEqual([]);
  });
});
