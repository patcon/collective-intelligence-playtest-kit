import { parseToParticipant } from '../room/protocol.ts';
import type { ParticipantMessage, ParticipantView } from '../room/protocol.ts';

/** What a simulated participant needs of its socket: to send text and to close. */
export interface SimSocket {
  send: (text: string) => void;
  close: () => void;
}

/** Opens a participant socket as `id`, calling back on each open (reconnects too) and each message. */
export type ConnectSim = (id: string, handlers: { onOpen: () => void; onMessage: (raw: string) => void }) => SimSocket;

export interface SimulatedParticipantOptions {
  id: string;
  connect: ConnectSim;
  autoConfirm: boolean;
  /** How long to wait, in ms, before tapping "found them" by itself. */
  delay: () => number;
}

/**
 * A participant with no screen: the same protocol as a phone, over its own socket. It's ready as
 * soon as it connects; with `autoConfirm` on, it taps "found them" a while after being matched.
 */
export class SimulatedParticipant {
  readonly id: string;
  #autoConfirm: boolean;
  #delay: () => number;
  #socket: SimSocket;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #view: ParticipantView | null = null;

  constructor({ id, connect, autoConfirm, delay }: SimulatedParticipantOptions) {
    this.id = id;
    this.#autoConfirm = autoConfirm;
    this.#delay = delay;
    this.#socket = connect(id, {
      onMessage: (raw) => this.#onMessage(raw),
      onOpen: () => this.#send({ type: 'ready' }),
    });
  }

  setAutoConfirm(on: boolean): void {
    this.#autoConfirm = on;
    this.#schedule();
  }

  /** Tick "found them", as a phone does. */
  found(): void {
    this.#send({ found: true, type: 'found' });
  }

  dispose(): void {
    this.#cancel();
    this.#socket.close();
  }

  #send(msg: ParticipantMessage): void {
    this.#socket.send(JSON.stringify(msg));
  }

  #onMessage(raw: string): void {
    const msg = parseToParticipant(raw);
    if (msg) {
      this.#view = msg.view;
      this.#schedule();
    }
  }

  /** A tap is pending exactly while auto-confirm is on and this participant is matched but hasn't found. */
  #schedule(): void {
    if (!this.#autoConfirm || this.#view?.status !== 'matched') {
      this.#cancel();
    } else if (this.#timer === null) {
      this.#timer = setTimeout(() => {
        this.#timer = null;
        this.found();
      }, this.#delay());
    }
  }

  #cancel(): void {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
  }
}
