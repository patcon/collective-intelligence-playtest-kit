import { newSimId, randomDelay, SimCrowd } from '@playtest-kit/common/simulation';
import type { ConnectSim, SimSummary } from '@playtest-kit/common/simulation';
import { SimulatedParticipant } from './SimulatedParticipant.ts';

/** The most simulated participants a page runs at once. */
export const MAX_SIMS = 50;

export interface CrowdState {
  autoConfirm: boolean;
  sims: ReadonlyArray<SimSummary>;
}

/** Between 2 and 8 seconds: long enough to watch the counts go up, short enough not to wait on. */
function tapDelay(): number {
  return randomDelay(2000, 8000);
}

/**
 * Every simulated participant on this page, as a store React can read (`subscribe`, `getState`): the
 * shared `SimCrowd`, plus auto-confirm, which applies to every sim, and tapping "found them" for one.
 */
export class SimulatedCrowd {
  #autoConfirm = true;
  #crowd: SimCrowd<SimulatedParticipant>;
  #listeners = new Set<() => void>();
  #state: CrowdState = { autoConfirm: true, sims: [] };

  constructor(connect: ConnectSim, delay: () => number = tapDelay) {
    this.#crowd = new SimCrowd({
      build: (id) => new SimulatedParticipant({ autoConfirm: this.#autoConfirm, connect, delay, id }),
      limit: MAX_SIMS,
      newId: newSimId,
    });
    this.#crowd.subscribe(() => this.#publish());
  }

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  getState = (): CrowdState => this.#state;

  /** Adds or removes sims, newest first out, to make `count` (kept within 0 and `MAX_SIMS`). */
  setCount(count: number): void {
    this.#crowd.setCount(count);
  }

  setAutoConfirm(on: boolean): void {
    this.#autoConfirm = on;
    for (const sim of this.#crowd.sims) {
      sim.setAutoConfirm(on);
    }
    this.#publish();
  }

  /** Taps "found them" for one sim, by id. */
  found(id: string): void {
    this.#crowd.sims.find((sim) => sim.id === id)?.found();
  }

  dispose(): void {
    this.#crowd.dispose();
  }

  #publish(): void {
    this.#state = { autoConfirm: this.#autoConfirm, sims: this.#crowd.getState().sims };
    for (const listener of this.#listeners) {
      listener();
    }
  }
}
