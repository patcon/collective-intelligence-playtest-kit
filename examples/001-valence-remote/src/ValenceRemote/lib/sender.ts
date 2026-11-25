export type Valence = number | null;

/** Send at most this often. */
export const SEND_MS = 50;

/**
 * Decides when a valence is worth sending: only when it changes (the room keeps a phone's last
 * value, so a held one needn't be repeated), and at most every SEND_MS. Call `update` on every
 * reading and `flush` on a timer (every SEND_MS); each returns the value to send now, or undefined.
 */
export interface Sender {
  update: (value: Valence, now: number) => Valence | undefined;
  flush: (now: number) => Valence | undefined;
}

export function createSender(): Sender {
  let latest: Valence | undefined;
  let sent: Valence | undefined;
  let sentAt = Number.NEGATIVE_INFINITY;

  function flush(now: number): Valence | undefined {
    if (latest === undefined || latest === sent || now - sentAt < SEND_MS) {
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
