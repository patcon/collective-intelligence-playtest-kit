import { describe, expect, it } from 'vitest';
import { straySimIds } from './straySimIds.ts';

describe('straySimIds', () => {
  it("picks out sims this page didn't make, leaving its own sims and real phones alone", () => {
    expect(straySimIds(['sim-mine', 'sim-stray', 'phone-abc'], new Set(['sim-mine']))).toEqual(['sim-stray']);
  });

  it('finds none when every sim is this page’s own', () => {
    expect(straySimIds(['sim-mine', 'phone-abc'], new Set(['sim-mine']))).toEqual([]);
  });
});
