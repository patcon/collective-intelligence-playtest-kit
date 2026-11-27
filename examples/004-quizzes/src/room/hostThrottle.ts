/** The time and timers the throttle runs on. Injected, so tests can drive them. */
export interface Clock {
  now: () => number;
  setTimer: (run: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimer: (timer: ReturnType<typeof setTimeout>) => void;
}

const REAL_CLOCK: Clock = { clearTimer: (timer) => clearTimeout(timer), now: () => Date.now(), setTimer: (run, ms) => setTimeout(run, ms) };

/** How often, at most, the host hears about a change that isn't a phase change. */
export const HOST_WINDOW_MS = 250;

/**
 * Sends the host a snapshot at most once per window. The first change sends at once; changes within the
 * window after a send fold into one send at its end, of the room as it is then. An urgent change (a phase
 * change) sends at once, and takes the place of any send that was waiting.
 */
export class HostThrottle {
  #send: () => void;
  #windowMs: number;
  #clock: Clock;
  #lastSent = Number.NEGATIVE_INFINITY;
  #pending: ReturnType<typeof setTimeout> | null = null;

  constructor(send: () => void, windowMs = HOST_WINDOW_MS, clock: Clock = REAL_CLOCK) {
    this.#send = send;
    this.#windowMs = windowMs;
    this.#clock = clock;
  }

  changed(urgent = false): void {
    const wait = this.#lastSent + this.#windowMs - this.#clock.now();
    if (urgent || (wait <= 0 && this.#pending === null)) {
      this.#flush();
    } else if (this.#pending === null) {
      this.#pending = this.#clock.setTimer(() => this.#flush(), wait);
    }
  }

  dispose(): void {
    this.#cancel();
  }

  #flush(): void {
    this.#cancel();
    this.#lastSent = this.#clock.now();
    this.#send();
  }

  #cancel(): void {
    if (this.#pending !== null) {
      this.#clock.clearTimer(this.#pending);
      this.#pending = null;
    }
  }
}
