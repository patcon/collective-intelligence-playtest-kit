import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../room/matchConfig.ts';
import type { RoomSnapshot } from '../room/protocol.ts';
import { progressOf } from './progressOf.ts';

const red = { hex: '#e6194b', name: 'Red', type: 'colour' } as const;
const blue = { hex: '#4363d8', name: 'Blue', type: 'colour' } as const;

describe('progressOf', () => {
  it('counts who is ready in the lobby', () => {
    const snapshot: RoomSnapshot = {
      config: DEFAULT_CONFIG,
      groups: [],
      participants: [
        { group: null, id: 'a', status: 'waiting' },
        { group: null, id: 'b', status: 'waiting' },
        { group: null, id: 'c', status: 'joined' },
      ],
      phase: 'lobby',
      round: 0,
      roundConfig: null,
    };
    expect(progressOf(snapshot)).toMatchObject({ groups: 0, nextRound: 2, people: 0, ready: 2 });
  });

  it('counts people found one by one', () => {
    const snapshot: RoomSnapshot = {
      config: DEFAULT_CONFIG,
      groups: [
        { cue: red, found: 2, size: 3 },
        { cue: blue, found: 0, size: 2 },
      ],
      participants: [{ group: null, id: 'z', status: 'late' }],
      phase: 'round',
      round: 1,
      roundConfig: null,
    };
    expect(progressOf(snapshot)).toEqual({ groups: 2, nextRound: 1, people: 5, peopleFound: 2, ready: 0 });
  });
});
