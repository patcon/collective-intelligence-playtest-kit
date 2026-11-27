import { newSimId, randomDelay, SimCrowd } from '@playtest-kit/common/simulation';
import type { ConnectSim } from '@playtest-kit/common/simulation';
import { drawPerson, PEOPLE, withinSkips } from './responses.ts';
import type { Person } from './responses.ts';
import { QuizSim } from './QuizSim.ts';

/** The most simulated participants a page runs at once. */
export const MAX_SIMS = 200;

/** How many sims join when the page opens. */
export const DEFAULT_SIMS = 50;

/** How much faster than a live room the sims can answer. */
export const SPEEDS = [1, 2, 5, 10, 20] as const;
export type Speed = (typeof SPEEDS)[number];

export interface SimDetails {
  id: string;
  /** "Sim 1", "Sim 2"…, by position. */
  name: string;
  person: Person;
}

export interface QuizCrowdState {
  sims: ReadonlyArray<SimDetails>;
  /** The most statements a newly added sim's person skipped in the real data; null is no limit. */
  maxSkipped: number | null;
  /** How many more were asked for than there are people left within `maxSkipped`. */
  short: number;
  /** Divides each wait that starts from now on. */
  speed: Speed;
}

/** Between 3 and 9 seconds a statement: a live room answering with some time pressure. */
function answerDelay(): number {
  return randomDelay(3000, 9000);
}

/**
 * Every simulated participant on this page, as a store React can read: the shared `SimCrowd`, with each sim
 * one real person from the sample, drawn at random without repeats from those within the skip threshold.
 */
export class QuizCrowd {
  #crowd: SimCrowd<QuizSim>;
  #people: ReadonlyArray<Person>;
  #listeners = new Set<() => void>();
  #maxSkipped: number | null = null;
  #short = 0;
  #speed: Speed = 1;
  #state: QuizCrowdState = { maxSkipped: null, short: 0, sims: [], speed: 1 };

  constructor(connect: ConnectSim, people: ReadonlyArray<Person> = PEOPLE, delay: () => number = answerDelay) {
    this.#people = people;
    this.#crowd = new SimCrowd({
      build: (id) => new QuizSim({ connect, delay: () => delay() / this.#speed, id, person: this.#draw() }),
      limit: MAX_SIMS,
      newId: newSimId,
    });
    this.#crowd.subscribe(() => this.#publish());
  }

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  getState = (): QuizCrowdState => this.#state;

  /** Adds or removes sims, newest first out, to make `count`: no more than `MAX_SIMS`, or than people left to draw. */
  setCount(count: number): void {
    const current = this.#crowd.sims.length;
    const free = this.#people.filter((p) => !this.#taken().has(p.row) && withinSkips(p, this.#maxSkipped)).length;
    const wanted = Math.min(MAX_SIMS, Math.max(0, Math.round(count)));
    const target = Math.min(wanted, current + free);
    this.#short = wanted - target;
    this.#crowd.setCount(target);
  }

  /** Applies to sims added from now on; those already here keep their person. */
  setMaxSkipped(maxSkipped: number | null): void {
    this.#maxSkipped = maxSkipped;
    this.#short = 0;
    this.#publish();
  }

  /** Applies to the waits that start from now on; one already under way runs out at the old speed. */
  setSpeed(speed: Speed): void {
    this.#speed = speed;
    this.#publish();
  }

  /** Every sim on this page answers all its remaining statements straight away. Real phones aren't touched. */
  fastForward(): void {
    for (const sim of this.#crowd.sims) {
      sim.finish();
    }
  }

  dispose(): void {
    this.#crowd.dispose();
  }

  #taken(): Set<number> {
    return new Set(this.#crowd.sims.map((sim) => sim.person.row));
  }

  /** `setCount` only asks for as many sims as there are people left, so someone is always free here. */
  #draw(): Person {
    const person = drawPerson(this.#people, this.#taken(), this.#maxSkipped, Math.random);
    if (!person) {
      throw new Error('No one left to draw a sim from');
    }
    return person;
  }

  #publish(): void {
    const { sims } = this.#crowd.getState();
    this.#state = {
      maxSkipped: this.#maxSkipped,
      short: this.#short,
      speed: this.#speed,
      sims: sims.map((summary, i) => {
        const sim = this.#crowd.sims[i];
        if (!sim) {
          throw new Error(`No sim at ${i}`);
        }
        return { ...summary, person: sim.person };
      }),
    };
    for (const listener of this.#listeners) {
      listener();
    }
  }
}
