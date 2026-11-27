import { describe, expect, it } from 'vitest';
import { drawPerson, PEOPLE } from './responses.ts';
import type { Person } from './responses.ts';

const person = (row: number, skipped: number): Person => ({ answers: {}, country: 'NONE', row, skipped });
const people = [person(0, 0), person(1, 3), person(2, 1)];

describe('PEOPLE', () => {
  it('has every response, with 50 answers each and its skips counted', () => {
    expect(PEOPLE).toHaveLength(1000);
    const [first] = PEOPLE;
    expect(Object.keys(first?.answers ?? {})).toHaveLength(50);
    expect(PEOPLE.every((p) => p.skipped === Object.values(p.answers).filter((a) => a === null).length)).toBe(true);
  });
});

describe('drawPerson', () => {
  it('only draws people within the skip threshold', () => {
    for (let i = 0; i < 20; i++) {
      expect(drawPerson(people, new Set(), 1, Math.random)?.skipped).toBeLessThanOrEqual(1);
    }
  });

  it('never draws someone taken, and runs out', () => {
    const taken = new Set<number>();
    for (let i = 0; i < people.length; i++) {
      const drawn = drawPerson(people, taken, null, Math.random);
      expect(drawn && taken.has(drawn.row)).toBe(false);
      taken.add(drawn?.row ?? -1);
    }
    expect(drawPerson(people, taken, null, Math.random)).toBeNull();
    expect(drawPerson(people, new Set([0, 2]), 1, Math.random)).toBeNull();
  });
});
