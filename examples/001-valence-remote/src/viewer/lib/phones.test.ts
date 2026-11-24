import { describe, expect, it } from 'vitest';
import { applyMessage, rateOf } from './phones.ts';
import type { Phones } from './phones.ts';

const valence = (id: string, v: number | null) => ({ id, t: 0, type: 'valence', v }) as const;

describe('applyMessage', () => {
  it('adds a row when a phone joins, and ignores viewers', () => {
    let phones: Phones = {};
    phones = applyMessage(phones, { id: 'a', role: 'phone', type: 'joined' }, 0);
    phones = applyMessage(phones, { id: 'b', role: 'viewer', type: 'joined' }, 0);
    expect(Object.keys(phones)).toEqual(['a']);
    expect(phones.a?.v).toBeNull();
  });

  it('adds a row for a phone first heard through its valence', () => {
    const phones = applyMessage({}, valence('a', 0.4), 100);
    expect(phones.a).toMatchObject({ recent: [100], v: 0.4 });
  });

  it('removes a row when its phone leaves', () => {
    const phones = applyMessage(applyMessage({}, valence('a', 0), 0), { id: 'a', type: 'left' }, 10);
    expect(phones).toEqual({});
  });

  it("records a phone's activity without counting it as a valence", () => {
    let phones = applyMessage({}, valence('a', 0.4), 100);
    phones = applyMessage(phones, { activity: 'idle', id: 'a', type: 'activity' }, 200);
    expect(phones.a).toMatchObject({ activity: 'idle', recent: [100], v: 0.4 });
  });

  it('ignores a valence from a phone without an id', () => {
    const phones = applyMessage({}, { type: 'valence', v: 1 }, 0);
    expect(phones).toEqual({});
  });
});

describe('rateOf', () => {
  it('counts messages from the last second only', () => {
    let phones: Phones = {};
    for (const t of [0, 300, 1200, 1300, 1400]) {
      phones = applyMessage(phones, valence('a', 0), t);
    }
    const row = phones.a;
    if (!row) {
      throw new Error('expected a row');
    }
    expect(rateOf(row, 1400)).toBe(3);
    expect(rateOf(row, 3000)).toBe(0);
  });
});
