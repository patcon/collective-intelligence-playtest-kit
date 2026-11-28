import { ITEMS, TRAITS } from '../items/items.ts';
import type { Item, ItemId } from '../items/items.ts';
import { seededRng } from '../room/rng.ts';
import type { Answer } from '../room/protocol.ts';
import { PEOPLE } from '../simulation/responses.ts';
import type { Person } from '../simulation/responses.ts';

/**
 * PROTOTYPE. A room's answers arriving over time, simulated locally (no server): each participant is a real
 * person from the sample, joins at some point, then answers the chosen statements in order, 3–9 s each at ×1.
 */

export interface Participant {
  id: string;
  /** "P1", "P2"…, in the order they joined. */
  name: string;
  person: Person;
  /** A new map only when they answer, so unchanged participants keep the same object. */
  answers: ReadonlyMap<ItemId, Answer>;
}

export interface StreamSnapshot {
  statements: ReadonlyArray<Item>;
  /** How many joins and answers this state includes, of the log so far. */
  events: number;
  /** Simulated ms at the last of those. */
  time: number;
  /** How many events the whole quiz will have: everyone added so far joining and answering everything. */
  total: number;
  /** Those who have joined, in the order they joined. */
  participants: ReadonlyArray<Participant>;
  /** Every answer is in. */
  done: boolean;
}

/** One thing that happened, for replaying the stream up to any point: someone joining, or answering. */
interface StreamEvent {
  t: number;
  participant: Participant;
  item: ItemId | null;
  answer: Answer;
}

interface Pending {
  participant: Participant;
  joinAt: number;
  dueAt: number;
}

export const STREAM_SPEEDS = [1, 5, 20, 100] as const;

/** `count` statements, an equal share from each trait (the lowest-numbered ones), in the test's order. */
function chooseStatements(count: number): Array<Item> {
  const perTrait = Math.max(1, Math.round(count / TRAITS.length));
  return ITEMS.filter((item) => Number(item.id.slice(3)) <= perTrait);
}

export class AnswerStream {
  #statements: Array<Item> = [];
  #pending: Array<Pending> = [];
  #time = 0;
  #speed = 5;
  #paused = false;
  #rng = seededRng(1);
  #taken = new Set<number>();
  #joined = 0;
  #listeners = new Set<() => void>();
  #events: Array<StreamEvent> = [];
  #snapshot: StreamSnapshot = { done: true, events: 0, participants: [], statements: [], time: 0, total: 0 };

  constructor(people: number, statements: number) {
    this.reset(people, statements);
  }

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  getSnapshot = (): StreamSnapshot => this.#snapshot;

  get speed(): number {
    return this.#speed;
  }

  get paused(): boolean {
    return this.#paused;
  }

  reset(people: number, statements: number): void {
    this.#statements = chooseStatements(statements);
    this.#pending = [];
    this.#time = 0;
    this.#taken.clear();
    this.#joined = 0;
    this.#events = [];
    this.addPeople(people, 20_000);
  }

  /** `count` more people from the sample, joining over the next `spreadMs` (simulated). */
  addPeople(count: number, spreadMs = 5000): void {
    for (let i = 0; i < count; i += 1) {
      const free = PEOPLE.filter((p) => !this.#taken.has(p.row) && p.skipped <= 2);
      const person = free[Math.floor(this.#rng() * free.length)];
      if (!person) {
        break;
      }
      this.#taken.add(person.row);
      const joinAt = this.#time + this.#rng() * spreadMs;
      const participant: Participant = { answers: new Map(), id: `p${person.row}`, name: '', person };
      this.#pending.push({ dueAt: joinAt + this.#delay(), joinAt, participant });
    }
    this.#publish();
  }

  /** The state after the first `count` events of the log: an earlier point of the stream, for scrubbing back. */
  snapshotAt(count: number): StreamSnapshot {
    const answers = new Map<string, Map<ItemId, Answer>>();
    const people = new Map<string, Participant>();
    const events = this.#events.slice(0, count);
    for (const { participant, item, answer } of events) {
      if (item === null) {
        answers.set(participant.id, new Map());
        people.set(participant.id, participant);
      } else {
        answers.get(participant.id)?.set(item, answer);
      }
    }
    return {
      done: false,
      events: events.length,
      participants: [...people.values()].map((p) => ({ ...p, answers: answers.get(p.id) ?? new Map() })),
      statements: this.#statements,
      time: events.at(-1)?.t ?? 0,
      total: this.#total(),
    };
  }

  /** How many events of the log happened at or before simulated time `t` (the log is in time order). */
  eventsUntil(t: number): number {
    let lo = 0;
    let hi = this.#events.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((this.#events[mid]?.t ?? 0) <= t) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return lo;
  }

  setSpeed(speed: number): void {
    this.#speed = speed;
    this.#publish();
  }

  setPaused(paused: boolean): void {
    this.#paused = paused;
    this.#publish();
  }

  /** Everyone joins and answers everything, now. */
  finish(): void {
    this.#advance(Number.POSITIVE_INFINITY);
  }

  /** Moves simulated time on by `realMs` at the current speed. */
  tick(realMs: number): void {
    if (!this.#paused) {
      this.#advance(this.#time + realMs * this.#speed);
    }
  }

  #total(): number {
    return this.#pending.length * (1 + this.#statements.length);
  }

  #delay(): number {
    return 3000 + this.#rng() * 6000;
  }

  #advance(until: number): void {
    const total = this.#statements.length;
    const happened: Array<StreamEvent> = [];
    const joining = this.#pending.filter((p) => p.joinAt <= until && p.participant.name === '').toSorted((a, b) => a.joinAt - b.joinAt);
    for (const pending of joining) {
      this.#joined += 1;
      pending.participant = { ...pending.participant, name: `P${this.#joined}` };
      happened.push({ answer: null, item: null, participant: { ...pending.participant, answers: new Map() }, t: pending.joinAt });
    }
    for (const pending of this.#pending) {
      let { answers } = pending.participant;
      while (pending.dueAt <= until && answers.size < total) {
        const item = this.#statements[answers.size];
        if (!item) {
          break;
        }
        const answer = pending.participant.person.answers[item.id] ?? null;
        answers = new Map(answers).set(item.id, answer);
        happened.push({ answer, item: item.id, participant: pending.participant, t: pending.dueAt });
        pending.dueAt += this.#delay();
      }
      if (answers !== pending.participant.answers) {
        pending.participant = { ...pending.participant, answers };
      }
    }
    this.#time = Number.isFinite(until) ? until : this.#time;
    if (happened.length > 0) {
      this.#events.push(...happened.toSorted((a, b) => a.t - b.t));
      this.#publish();
    }
  }

  #publish(): void {
    const total = this.#statements.length;
    const joined = this.#pending
      .filter((p) => p.participant.name !== '')
      .toSorted((a, b) => a.joinAt - b.joinAt)
      .map((p) => p.participant);
    this.#snapshot = {
      done: joined.length === this.#pending.length && joined.every((p) => p.answers.size === total),
      events: this.#events.length,
      participants: joined,
      statements: this.#statements,
      time: this.#events.at(-1)?.t ?? 0,
      total: this.#total(),
    };
    for (const listener of this.#listeners) {
      listener();
    }
  }
}
