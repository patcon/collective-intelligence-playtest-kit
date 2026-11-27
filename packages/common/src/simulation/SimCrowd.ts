/** One simulated participant, as the crowd sees it: an id, and a way to close its socket. */
export interface Sim {
  readonly id: string;
  dispose: () => void;
}

export interface SimSummary {
  id: string;
  /** "Sim 1", "Sim 2"…, by position. */
  name: string;
}

export interface SimCrowdState {
  sims: ReadonlyArray<SimSummary>;
}

/**
 * Every simulated participant on a page, as a store React can read (`subscribe`, `getState`).
 * `build` makes a sim for an id (connecting it); removing a sim disposes it, so the room hears it
 * leave. What a sim does is up to `build`; the crowd only keeps the count.
 */
export class SimCrowd<S extends Sim> {
  readonly limit: number;
  #build: (id: string) => S;
  #newId: () => string;
  #listeners = new Set<() => void>();
  #sims: Array<S> = [];
  #state: SimCrowdState = { sims: [] };

  constructor({ build, limit, newId }: { build: (id: string) => S; limit: number; newId: () => string }) {
    this.#build = build;
    this.limit = limit;
    this.#newId = newId;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  getState = (): SimCrowdState => this.#state;

  /** The sims themselves, oldest first, for the example's own crowd-wide settings. */
  get sims(): ReadonlyArray<S> {
    return this.#sims;
  }

  /** Adds or removes sims, newest first out, to make `count` (kept within 0 and `limit`). */
  setCount(count: number): void {
    const target = Math.max(0, Math.min(this.limit, Math.round(count)));
    while (this.#sims.length < target) {
      this.#sims.push(this.#build(this.#newId()));
    }
    for (const sim of this.#sims.splice(target)) {
      sim.dispose();
    }
    this.#publish();
  }

  dispose(): void {
    this.setCount(0);
  }

  #publish(): void {
    this.#state = { sims: this.#sims.map((sim, i) => ({ id: sim.id, name: `Sim ${i + 1}` })) };
    for (const listener of this.#listeners) {
      listener();
    }
  }
}
