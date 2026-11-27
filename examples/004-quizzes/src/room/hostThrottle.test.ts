import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HostThrottle } from './hostThrottle.ts';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** A throttle whose sends record the room's `version` at the time. */
function throttled() {
  const room = { version: 0 };
  const sent: Array<number> = [];
  const throttle = new HostThrottle(() => sent.push(room.version), 250);
  const change = (urgent = false) => {
    room.version++;
    throttle.changed(urgent);
  };
  return { change, sent, throttle };
}

describe('HostThrottle', () => {
  it('sends the first change at once', () => {
    const { change, sent } = throttled();
    change();
    expect(sent).toEqual([1]);
  });

  it('folds a burst into one send per window, always ending on the latest state', () => {
    const { change, sent } = throttled();
    for (let i = 0; i < 50; i++) {
      change();
      vi.advanceTimersByTime(10);
    }
    vi.advanceTimersByTime(250);
    expect(sent.length).toBeLessThanOrEqual(3);
    expect(sent.at(-1)).toBe(50);
  });

  it('waits only out the rest of the window', () => {
    const { change, sent } = throttled();
    change();
    vi.advanceTimersByTime(200);
    change();
    vi.advanceTimersByTime(49);
    expect(sent).toEqual([1]);
    vi.advanceTimersByTime(1);
    expect(sent).toEqual([1, 2]);
  });

  it('sends a phase change at once, in place of a waiting send', () => {
    const { change, sent } = throttled();
    change();
    change();
    change(true);
    expect(sent).toEqual([1, 3]);
    vi.advanceTimersByTime(500);
    expect(sent).toEqual([1, 3]);
  });

  it('sends nothing more once disposed', () => {
    const { change, sent, throttle } = throttled();
    change();
    change();
    throttle.dispose();
    vi.advanceTimersByTime(500);
    expect(sent).toEqual([1]);
  });
});
