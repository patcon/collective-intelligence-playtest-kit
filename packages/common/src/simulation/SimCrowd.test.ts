import { describe, expect, it, vi } from 'vitest';
import { SimCrowd } from './SimCrowd.ts';

function crowdOf(limit: number) {
  const dispose = vi.fn();
  let next = 0;
  const crowd = new SimCrowd({ build: (id) => ({ dispose, id }), limit, newId: () => `sim-${++next}` });
  return { crowd, dispose };
}

describe('SimCrowd', () => {
  it('adds sims up to the count, named by position, and no more than its limit', () => {
    const { crowd } = crowdOf(5);
    crowd.setCount(3);
    expect(crowd.getState().sims.map((s) => s.name)).toEqual(['Sim 1', 'Sim 2', 'Sim 3']);
    crowd.setCount(9);
    expect(crowd.getState().sims).toHaveLength(5);
    crowd.setCount(-2);
    expect(crowd.getState().sims).toEqual([]);
  });

  it('removes the newest sims first, disposing them', () => {
    const { crowd, dispose } = crowdOf(5);
    crowd.setCount(3);
    crowd.setCount(1);
    expect(crowd.getState().sims).toEqual([{ id: 'sim-1', name: 'Sim 1' }]);
    expect(crowd.sims.map((s) => s.id)).toEqual(['sim-1']);
    expect(dispose).toHaveBeenCalledTimes(2);
  });

  it('tells listeners about each change, with a new state each time', () => {
    const { crowd } = crowdOf(5);
    const listener = vi.fn();
    const unsubscribe = crowd.subscribe(listener);
    const before = crowd.getState();
    crowd.setCount(2);
    expect(listener).toHaveBeenCalledOnce();
    expect(crowd.getState()).not.toBe(before);
    unsubscribe();
    crowd.setCount(1);
    expect(listener).toHaveBeenCalledOnce();
  });

  it('disposes every sim when disposed', () => {
    const { crowd, dispose } = crowdOf(5);
    crowd.setCount(4);
    crowd.dispose();
    expect(dispose).toHaveBeenCalledTimes(4);
    expect(crowd.getState().sims).toEqual([]);
  });
});
