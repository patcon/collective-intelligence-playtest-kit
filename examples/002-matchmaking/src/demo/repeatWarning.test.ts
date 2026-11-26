import { describe, expect, it } from 'vitest';
import { PALETTE } from '../cues/colour/colourCue.ts';
import type { RoomSnapshot } from '../room/protocol.ts';
import type { ParticipantStatus } from '../room/roomViews.ts';
import { repeatWarning } from './repeatWarning.ts';

function lobbyOf(n: number, size: number, status: ParticipantStatus = 'waiting'): RoomSnapshot {
  return {
    config: { algorithm: 'random', cue: 'colour', grouping: { by: 'groupSize', fit: 'smart', groupSize: size }, showFoundCount: false },
    groups: [],
    participants: Array.from({ length: n }, (_, i) => ({ group: null, id: `p${i}`, status })),
    phase: 'lobby',
    round: 0,
    roundConfig: null,
  };
}

describe('repeatWarning', () => {
  it('says nothing while every group can have its own colour', () => {
    expect(repeatWarning(lobbyOf(PALETTE.length * 2, 2))).toBeNull();
  });

  it('warns once there are more groups than colours', () => {
    expect(repeatWarning(lobbyOf(PALETTE.length * 2 + 2, 2))).toBe('13 groups, but Visual: Colour can only tell 12 apart, so some groups will share a cue.');
  });

  it('counts everyone ready, but not anyone still on the start screen', () => {
    expect(repeatWarning(lobbyOf(30, 2, 'joined'))).toBeNull();
    expect(repeatWarning(lobbyOf(30, 2, 'late'))).not.toBeNull();
  });
});
