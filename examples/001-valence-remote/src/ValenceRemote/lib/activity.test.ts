import { describe, expect, it } from 'vitest';
import { createActivityTracker, IDLE_MS, STILL_DEG } from './activity.ts';
import type { Vec } from './valence.ts';

const RAD = Math.PI / 180;

/** Face up, tipped `deg` degrees towards the top edge. */
function tipped(deg: number): Vec {
  return [0, Math.sin(deg * RAD), Math.cos(deg * RAD)];
}

describe('tilt', () => {
  it('is idle before any movement', () => {
    expect(createActivityTracker().at(0)).toBe('idle');
  });

  it('stays active while moving, and goes idle once still for IDLE_MS', () => {
    const tracker = createActivityTracker();
    tracker.tilt(tipped(0), 0);
    tracker.tilt(tipped(10), 1000);
    expect(tracker.at(1000 + IDLE_MS - 1)).toBe('active');
    expect(tracker.at(1000 + IDLE_MS)).toBe('idle');
  });

  it('counts jitter within STILL_DEG as still, however long it goes on', () => {
    const tracker = createActivityTracker();
    tracker.tilt(tipped(0), 0);
    for (let t = 100; t <= 2 * IDLE_MS; t += 100) {
      tracker.tilt(tipped((t / 100) % 2 === 0 ? STILL_DEG * 0.9 : 0), t);
    }
    expect(tracker.at(2 * IDLE_MS)).toBe('idle');
  });

  it('counts slow drift once it adds up past STILL_DEG from where it was', () => {
    const tracker = createActivityTracker();
    tracker.tilt(tipped(0), 0);
    tracker.tilt(tipped(STILL_DEG * 0.6), 1000);
    tracker.tilt(tipped(STILL_DEG * 1.2), 2000);
    expect(tracker.at(2000 + IDLE_MS - 1)).toBe('active');
  });
});

describe('touch', () => {
  it('is active while a finger is down, and idle as soon as it lifts', () => {
    const tracker = createActivityTracker();
    tracker.touch(true);
    expect(tracker.at(10 * IDLE_MS)).toBe('active');
    tracker.touch(false);
    expect(tracker.at(10 * IDLE_MS)).toBe('idle');
  });
});

describe('poke', () => {
  it('counts as a movement', () => {
    const tracker = createActivityTracker();
    tracker.poke(0);
    expect(tracker.at(IDLE_MS - 1)).toBe('active');
    expect(tracker.at(IDLE_MS)).toBe('idle');
  });
});
