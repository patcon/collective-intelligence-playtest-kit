export type Valence = number | null;

/** Send at most this often. */
export const SEND_MS = 50;
/** Resend at least this often while the value holds, so the room knows the phone is still there. */
export const KEEPALIVE_MS = 1000;
/** A change smaller than this isn't worth sending before the keepalive. */
export const SEND_EPSILON = 0.004;

/**
 * Decides when a valence is worth sending. Call `update` on every reading and `flush` on a timer
 * (every SEND_MS); each returns the value to send now, or undefined.
 */
export interface Sender {
  update: (value: Valence, now: number) => Valence | undefined;
  flush: (now: number) => Valence | undefined;
}

function changed(a: Valence, b: Valence): boolean {
  if (a === null || b === null) {
    return a !== b;
  }
  return Math.abs(a - b) >= SEND_EPSILON;
}

export function createSender(): Sender {
  let latest: Valence | undefined;
  let sent: Valence | undefined;
  let sentAt = Number.NEGATIVE_INFINITY;

  function due(value: Valence, now: number): boolean {
    const elapsed = now - sentAt;
    if (sent === undefined || elapsed >= KEEPALIVE_MS) {
      return true;
    }
    return elapsed >= SEND_MS && changed(value, sent);
  }

  function flush(now: number): Valence | undefined {
    if (latest === undefined || !due(latest, now)) {
      return undefined;
    }
    sent = latest;
    sentAt = now;
    return latest;
  }

  return {
    flush,
    update(value, now) {
      latest = value;
      return flush(now);
    },
  };
}
