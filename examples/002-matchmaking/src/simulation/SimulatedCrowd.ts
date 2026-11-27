import { newSimId, randomDelay } from '@playtest-kit/common/simulation';
import type { ConnectSim } from '@playtest-kit/common/simulation';
import { SimulatedParticipant } from './SimulatedParticipant.ts';

/** The most simulated participants a page runs at once. */
export const MAX_SIMS = 50;

export interface SimSummary {
  id: string;
  /** "Sim 1", "Sim 2"…, by position. */
  name: string;
}

export interface CrowdState {
  autoConfirm: boolean;
  sims: ReadonlyArray<SimSummary>;
}

/** Between 2 and 8 seconds: long enough to watch the counts go up, short enough not to wait on. */
function tapDelay(): number {
  return randomDelay(2000, 8000);
}

/**
 * Every simulated participant on this page, as a store React can read (`subscribe`, `getState`).
 * Adding sims connects them; removing them closes their sockets, so the room hears them leave.
 */
export class SimulatedCrowd {
  #connect: ConnectSim;
  #delay: () => number;
  #listeners = new Set<() => void>();
  #sims: Array<SimulatedParticipant> = [];
  #state: CrowdState = { autoConfirm: true, sims: [] };

  constructor(connect: ConnectSim, delay: () => number = tapDelay) {
    this.#connect = connect;
    this.#delay = delay;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  getState = (): CrowdState => this.#state;

  /** Adds or removes sims, newest first out, to make `count` (kept within 0 and `MAX_SIMS`). */
  setCount(count: number): void {
    const target = Math.max(0, Math.min(MAX_SIMS, Math.round(count)));
    while (this.#sims.length < target) {
      const { autoConfirm } = this.#state;
      this.#sims.push(new SimulatedParticipant({ autoConfirm, connect: this.#connect, delay: this.#delay, id: newSimId() }));
    }
    for (const sim of this.#sims.splice(target)) {
      sim.dispose();
    }
    this.#publish();
  }

  setAutoConfirm(on: boolean): void {
    for (const sim of this.#sims) {
      sim.setAutoConfirm(on);
    }
    this.#state = { ...this.#state, autoConfirm: on };
    this.#publish();
  }

  /** Taps "found them" for one sim, by id. */
  found(id: string): void {
    this.#sims.find((sim) => sim.id === id)?.found();
  }

  dispose(): void {
    this.setCount(0);
  }

  #publish(): void {
    this.#state = { ...this.#state, sims: this.#sims.map((sim, i) => ({ id: sim.id, name: `Sim ${i + 1}` })) };
    for (const listener of this.#listeners) {
      listener();
    }
  }
}
