import { describe, expect, it } from 'vitest';
import { seededRng } from '../../matching/rng.ts';
import { assignHaptics, isHapticCue, RHYTHM_COUNT, RHYTHM_IDS, RHYTHM_PERIOD_MS, RHYTHMS, rhythmLength } from './hapticCue.ts';

describe('assignHaptics', () => {
  it('gives every group a different rhythm, up to the number of rhythms', () => {
    const cues = assignHaptics(RHYTHM_COUNT, seededRng(1));
    expect(new Set(cues.map((c) => c.rhythm)).size).toBe(RHYTHM_COUNT);
  });

  it('repeats rhythms only once every one is in use', () => {
    const cues = assignHaptics(RHYTHM_COUNT + 2, seededRng(2));
    expect(cues).toHaveLength(RHYTHM_COUNT + 2);
    expect(new Set(cues.slice(0, RHYTHM_COUNT).map((c) => c.rhythm)).size).toBe(RHYTHM_COUNT);
  });
});

describe('RHYTHMS', () => {
  it('are six, none the same, and each vibration within the 1 s the library allows', () => {
    expect(RHYTHM_COUNT).toBe(6);
    expect(new Set(RHYTHM_IDS.map((id) => JSON.stringify(RHYTHMS[id].pattern))).size).toBe(6);
    for (const id of RHYTHM_IDS) {
      for (const { duration } of RHYTHMS[id].pattern) {
        expect(duration).toBeLessThanOrEqual(1000);
      }
    }
  });

  it('each end with at least a second to spare before the next one starts', () => {
    for (const id of RHYTHM_IDS) {
      expect(RHYTHM_PERIOD_MS - rhythmLength(id), id).toBeGreaterThanOrEqual(1000);
    }
  });
});

describe('isHapticCue', () => {
  it('accepts a known rhythm and rejects an unknown one', () => {
    expect(isHapticCue({ rhythm: 'heartbeat', type: 'haptic' })).toBe(true);
    expect(isHapticCue({ rhythm: 'samba', type: 'haptic' })).toBe(false);
    expect(isHapticCue({ rhythm: 'toString', type: 'haptic' })).toBe(false);
  });
});
