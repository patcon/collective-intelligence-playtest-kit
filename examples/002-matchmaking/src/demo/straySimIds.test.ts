import { describe, expect, it } from 'vitest';
import type { RoomSnapshot } from '../room/protocol.ts';
import { straySimIds } from './straySimIds.ts';

function roomWith(...ids: Array<string>): RoomSnapshot {
  return {
    config: { algorithm: 'random', cue: 'colour', grouping: { by: 'size', size: 2 }, showFoundCount: false },
    groups: [],
    participants: ids.map((id) => ({ group: null, id, status: 'waiting' })),
    phase: 'lobby',
    round: 0,
    roundConfig: null,
  };
}

describe('straySimIds', () => {
  it("picks out sims this page didn't make, leaving its own sims and real phones alone", () => {
    expect(straySimIds(roomWith('sim-mine', 'sim-stray', 'phone-abc'), new Set(['sim-mine']))).toEqual(['sim-stray']);
  });

  it('finds none when every sim is this page’s own', () => {
    expect(straySimIds(roomWith('sim-mine', 'phone-abc'), new Set(['sim-mine']))).toEqual([]);
  });
});
