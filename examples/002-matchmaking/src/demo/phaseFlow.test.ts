import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../room/matchConfig.ts';
import type { RoomSnapshot } from '../room/protocol.ts';
import { groupColour, phaseFlow } from './phaseFlow.ts';

describe('phaseFlow', () => {
  it('puts everyone in the stage for their status, with late joiners among those waiting', () => {
    const snapshot: RoomSnapshot = {
      config: DEFAULT_CONFIG,
      groups: [],
      participants: [
        { group: null, id: 'a', status: 'joined' },
        { group: 0, id: 'b', status: 'matched' },
        { group: 0, id: 'c', status: 'found' },
        { group: null, id: 'd', status: 'late' },
      ],
      phase: 'round',
      round: 1,
      roundConfig: null,
    };
    expect(phaseFlow(snapshot)).toEqual({
      activity: [],
      found: [{ group: 0, id: 'c', status: 'found' }],
      looking: [{ group: 0, id: 'b', status: 'matched' }],
      starting: [{ group: null, id: 'a', status: 'joined' }],
      waiting: [{ group: null, id: 'd', status: 'late' }],
    });
  });
});

/** A round with these groups, and no one in it. */
function round(groups: RoomSnapshot['groups']): RoomSnapshot {
  return { config: DEFAULT_CONFIG, groups, participants: [], phase: 'round', round: 1, roundConfig: null };
}

describe('phaseFlow ordering', () => {
  it("keeps each group's members together, and puts late joiners after those waiting", () => {
    const snapshot: RoomSnapshot = {
      config: DEFAULT_CONFIG,
      groups: [],
      participants: [
        { group: 1, id: 'a', status: 'matched' },
        { group: 0, id: 'b', status: 'matched' },
        { group: 1, id: 'c', status: 'matched' },
        { group: null, id: 'd', status: 'late' },
        { group: null, id: 'e', status: 'waiting' },
      ],
      phase: 'round',
      round: 1,
      roundConfig: null,
    };
    const flow = phaseFlow(snapshot);
    expect(flow.looking.map((m) => m.id)).toEqual(['b', 'a', 'c']);
    expect(flow.waiting.map((m) => m.id)).toEqual(['e', 'd']);
  });
});

describe('groupColour', () => {
  it("uses a colour cue's own colour, so the dots match the phones", () => {
    expect(groupColour(round([{ cue: { hex: '#4363d8', name: 'Blue', type: 'colour' }, found: 0, size: 2 }]), 0)).toBe('#4363d8');
  });

  it('gives other cues a different colour per group', () => {
    const birds = round([
      { cue: { species: 'loon', type: 'birdsong' }, found: 0, size: 2 },
      { cue: { species: 'cuckoo', type: 'birdsong' }, found: 0, size: 2 },
    ]);
    expect(groupColour(birds, 0)).not.toBe(groupColour(birds, 1));
  });
});
