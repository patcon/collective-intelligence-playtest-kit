import { describe, expect, it } from 'vitest';
import { parseRoomMessage } from '../../room/protocol.ts';
import { createActivityTracker, IDLE_MS, spreadDegrees, STILL_DEG } from './activity.ts';
import type { Vec } from './valence.ts';
import chestBreathing from './fixtures/chest-breathing-flip.jsonl?raw';
import table from './fixtures/table-flip.jsonl?raw';

const RAD = Math.PI / 180;

/** Up, for a phone whose screen is tipped `deg` degrees from facing straight up. */
function tipped(deg: number): Vec {
  return [0, Math.sin(deg * RAD), Math.cos(deg * RAD)];
}

describe('spreadDegrees', () => {
  it('is 0 for one reading, and the angle between two close ones', () => {
    expect(spreadDegrees([tipped(30)])).toBe(0);
    expect(spreadDegrees([tipped(30), tipped(30.5)])).toBeCloseTo(0.5, 3);
  });
});

describe('tilt', () => {
  it('is idle with no readings', () => {
    expect(createActivityTracker().at(0)).toBe('idle');
  });

  it('is active while tilt spreads past STILL_DEG, and idle IDLE_MS after it stops', () => {
    const tracker = createActivityTracker();
    tracker.tilt(tipped(10), 0);
    tracker.tilt(tipped(10 + 2 * STILL_DEG), 1000);
    tracker.tilt(tipped(10 + 2 * STILL_DEG), 2000);
    expect(tracker.at(2000)).toBe('active');
    expect(tracker.at(IDLE_MS - 1)).toBe('active');
    expect(tracker.at(IDLE_MS)).toBe('idle');
  });

  it('counts jitter under STILL_DEG as still, however long it goes on', () => {
    const tracker = createActivityTracker();
    for (let t = 0; t <= 3 * IDLE_MS; t += 100) {
      tracker.tilt(tipped(10 + ((t / 100) % 2) * STILL_DEG * 0.9), t);
      expect(tracker.at(t)).toBe('idle');
    }
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
  it('keeps it active for IDLE_MS', () => {
    const tracker = createActivityTracker();
    tracker.poke(0);
    expect(tracker.at(IDLE_MS - 1)).toBe('active');
    expect(tracker.at(IDLE_MS)).toBe('idle');
  });
});

/**
 * Recordings from the viewer's message log (copied newest first) of a phone in flip mode, whose
 * valence is how far up its screen faces: the z of its up. Replayed from the first full IDLE_MS on.
 */
describe.each([
  ['on a table', table, 'idle'],
  ['pressed to a chest while breathing', chestBreathing, 'active'],
] as const)('a phone %s', (_name, recording, expected) => {
  const readings = recording
    .trim()
    .split('\n')
    .map(parseRoomMessage)
    .flatMap((msg) => (msg?.type === 'valence' && 't' in msg && msg.v !== null ? [{ t: msg.t, v: msg.v }] : []))
    .sort((a, b) => a.t - b.t);

  it(`reads as ${expected} throughout`, () => {
    expect(readings).toHaveLength(50);
    const tracker = createActivityTracker();
    const start = readings[0]?.t ?? 0;
    const seen = new Set<string>();
    for (const { t, v } of readings) {
      tracker.tilt([0, Math.sqrt(1 - v * v), v], t - start);
      if (t - start >= IDLE_MS) {
        seen.add(tracker.at(t - start));
      }
    }
    expect([...seen]).toEqual([expected]);
  });
});
