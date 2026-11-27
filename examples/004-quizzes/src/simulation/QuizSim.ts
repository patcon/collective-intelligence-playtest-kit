import type { ConnectSim, Sim, SimSocket } from '@playtest-kit/common/simulation';
import { parseToParticipant } from '../room/protocol.ts';
import type { ParticipantMessage, ParticipantView } from '../room/protocol.ts';
import type { Person } from './responses.ts';

export interface QuizSimOptions {
  id: string;
  connect: ConnectSim;
  person: Person;
  /** How long to wait, in ms, before answering each statement. */
  delay: () => number;
  /** Called when `unconnected` changes. */
  onConnectionChange?: () => void;
}

/** How long a new sim's socket has to open before it counts as unable to connect. */
export const CONNECT_GRACE_MS = 4000;

/**
 * A participant with no screen, answering as one real person from the sample did: the same protocol as a
 * phone, over its own socket. It's ready as soon as it connects; while answering, it waits a while, then
 * gives its person's answer to the statement it's on (or skips, where they skipped). It never undoes.
 * `finish()` sends every answer left at once. A sim whose socket hasn't opened within `CONNECT_GRACE_MS`
 * is `unconnected`: usually the browser's cap on open WebSockets (Firefox allows 200, across all its tabs).
 */
export class QuizSim implements Sim {
  readonly id: string;
  readonly person: Person;
  #delay: () => number;
  #socket: SimSocket;
  #timer: ReturnType<typeof setTimeout> | null = null;
  /** The view an answer is pending for, so a repeat of the same view doesn't start another wait. */
  #waitingOn: ParticipantView | null = null;
  /** The latest view, so `finish()` knows what's left. */
  #view: ParticipantView | null = null;
  #opened = false;
  #graceOver = false;
  #graceTimer: ReturnType<typeof setTimeout>;
  #onConnectionChange: () => void;
  /** The statements of a quiz this sim has sent every answer to, so the views that catch up don't start new waits. */
  #finished: string | null = null;

  constructor({ id, connect, person, delay, onConnectionChange = () => undefined }: QuizSimOptions) {
    this.id = id;
    this.person = person;
    this.#delay = delay;
    this.#onConnectionChange = onConnectionChange;
    this.#graceTimer = setTimeout(() => {
      this.#graceOver = true;
      if (!this.#opened) {
        this.#onConnectionChange();
      }
    }, CONNECT_GRACE_MS);
    this.#socket = connect(id, {
      onMessage: (raw) => this.#onMessage(raw),
      onOpen: () => this.#onOpen(),
    });
  }

  /** Never connected, though it's had time to. Its socket keeps trying, and may get through once others close. */
  get unconnected(): boolean {
    return this.#graceOver && !this.#opened;
  }

  #onOpen(): void {
    const wasUnconnected = this.unconnected;
    this.#opened = true;
    this.#send({ type: 'ready' });
    if (wasUnconnected) {
      this.#onConnectionChange();
    }
  }

  /** Answers every statement left in this quiz straight away, in order, and nothing after. */
  finish(): void {
    const view = this.#view;
    if (view?.status !== 'answering') {
      return;
    }
    this.#cancel();
    this.#finished = view.statements.join();
    for (const item of view.statements.slice(view.position)) {
      this.#send({ answer: this.person.answers[item] ?? null, item, type: 'answer' });
    }
  }

  dispose(): void {
    clearTimeout(this.#graceTimer);
    this.#cancel();
    this.#socket.close();
  }

  #send(msg: ParticipantMessage): void {
    this.#socket.send(JSON.stringify(msg));
  }

  #onMessage(raw: string): void {
    const view = parseToParticipant(raw)?.view;
    if (!view || (this.#waitingOn && sameStatement(this.#waitingOn, view))) {
      return;
    }
    this.#view = view;
    if (view.status !== 'answering') {
      this.#finished = null;
    }
    this.#cancel();
    if (this.#finished === view.statements.join()) {
      return;
    }
    if (view.status === 'answering') {
      this.#waitingOn = view;
      this.#timer = setTimeout(() => this.#answer(view), this.#delay());
    }
  }

  /** Once sent, a repeat of this view (say, after a reconnect that lost the answer) starts a new wait. */
  #answer(view: ParticipantView): void {
    this.#timer = null;
    this.#waitingOn = null;
    const item = view.statements[view.position];
    if (item !== undefined) {
      this.#send({ answer: this.person.answers[item] ?? null, item, type: 'answer' });
    }
  }

  #cancel(): void {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    this.#waitingOn = null;
  }
}

/** Whether two views have this sim on the same statement of the same quiz. */
function sameStatement(a: ParticipantView, b: ParticipantView): boolean {
  return a.status === b.status && a.position === b.position && a.statements.join() === b.statements.join();
}
