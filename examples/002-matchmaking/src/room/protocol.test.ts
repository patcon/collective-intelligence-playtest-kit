import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './matchConfig.ts';
import { parseHostMessage, parseParticipantMessage, parseToHost, parseToParticipant } from './protocol.ts';
import type { RoomSnapshot } from './protocol.ts';

const json = (value: unknown) => JSON.stringify(value);
const cue = { hex: '#e6194b', name: 'Red', type: 'colour' } as const;
/** A `view` message, as the room sends it, for the next round's cue type `nextCue`, with the found count hidden. */
const view = (v: unknown, nextCue = 'colour') => json({ nextCue, showFoundCount: false, type: 'view', view: v });

describe('parseParticipantMessage', () => {
  it('reads ready, and found ticked or unticked', () => {
    expect(parseParticipantMessage(json({ type: 'ready' }))).toEqual({ type: 'ready' });
    expect(parseParticipantMessage(json({ extra: 1, found: true, type: 'found' }))).toEqual({ found: true, type: 'found' });
    expect(parseParticipantMessage(json({ found: false, type: 'found' }))).toEqual({ found: false, type: 'found' });
  });

  it('rejects anything else, including found without a yes or no', () => {
    for (const raw of ['not json', json(null), json([]), json({ type: 'start' }), json({}), json({ type: 'found' }), json({ found: 'yes', type: 'found' })]) {
      expect(parseParticipantMessage(raw)).toBeNull();
    }
  });
});

describe('parseHostMessage', () => {
  it('reads the round controls and a valid config', () => {
    for (const type of ['start', 'moveOn', 'back', 'reset']) {
      expect(parseHostMessage(json({ type }))).toEqual({ type });
    }
    expect(parseHostMessage(json({ config: DEFAULT_CONFIG, type: 'config' }))).toEqual({ config: DEFAULT_CONFIG, type: 'config' });
  });

  it('rejects a config with a bad grouping, algorithm, cue or found-count switch', () => {
    const bad = [
      { ...DEFAULT_CONFIG, grouping: { by: 'groupSize', groupSize: 1 } },
      { ...DEFAULT_CONFIG, grouping: { by: 'groupCount', groupCount: 2.5 } },
      { ...DEFAULT_CONFIG, grouping: { by: 'groupSize', groupSize: 1000 } },
      { ...DEFAULT_CONFIG, grouping: { by: 'bogus' } },
      { ...DEFAULT_CONFIG, algorithm: 'smart' },
      { ...DEFAULT_CONFIG, cue: 'smell' },
      { ...DEFAULT_CONFIG, cue: 'toString' },
      { ...DEFAULT_CONFIG, showFoundCount: 'yes' },
    ];
    for (const config of bad) {
      expect(parseHostMessage(json({ config, type: 'config' }))).toBeNull();
    }
  });

  it('reads a list of ids to remove, and rejects anything else', () => {
    expect(parseHostMessage(json({ ids: ['sim-a', 'sim-b'], type: 'remove' }))).toEqual({ ids: ['sim-a', 'sim-b'], type: 'remove' });
    expect(parseHostMessage(json({ ids: 'sim-a', type: 'remove' }))).toBeNull();
    expect(parseHostMessage(json({ ids: ['sim-a', 3], type: 'remove' }))).toBeNull();
    expect(parseHostMessage(json({ type: 'remove' }))).toBeNull();
  });
});

describe('parseToParticipant', () => {
  it('reads a view with and without a group', () => {
    const matched = { cue, group: { found: 1, size: 3 }, status: 'matched' };
    expect(parseToParticipant(view(matched))).toEqual({ nextCue: 'colour', showFoundCount: false, type: 'view', view: matched });
    expect(parseToParticipant(view({ status: 'late' }))).toEqual({ nextCue: 'colour', showFoundCount: false, type: 'view', view: { status: 'late' } });
  });

  it('reads an activity view, which carries the group like a matched one', () => {
    const activity = { cue, group: { found: 0, size: 2 }, status: 'activity' };
    expect(parseToParticipant(view(activity))).toEqual({ nextCue: 'colour', showFoundCount: false, type: 'view', view: activity });
  });

  it('rejects a grouped view with no cue, and an unknown status', () => {
    expect(parseToParticipant(view({ group: { found: 0, size: 2 }, status: 'matched' }))).toBeNull();
    expect(parseToParticipant(view({ group: { found: 0, size: 2 }, status: 'activity' }))).toBeNull();
    expect(parseToParticipant(view({ status: 'dancing' }))).toBeNull();
  });

  it("rejects a view without the next round's cue type, or with an unknown one", () => {
    expect(parseToParticipant(json({ type: 'view', view: { status: 'waiting' } }))).toBeNull();
    expect(parseToParticipant(view({ status: 'waiting' }, 'smell'))).toBeNull();
  });

  it('rejects a view without a yes or no on showing the found count', () => {
    expect(parseToParticipant(json({ nextCue: 'colour', type: 'view', view: { status: 'waiting' } }))).toBeNull();
  });
});

describe('parseToHost', () => {
  const snapshot: RoomSnapshot = {
    config: DEFAULT_CONFIG,
    groups: [{ cue, found: 0, size: 1 }],
    participants: [{ group: 0, id: 'a', status: 'matched' }],
    phase: 'round',
    round: 1,
    roundConfig: null,
  };

  it('reads a snapshot, in a round or the activity', () => {
    expect(parseToHost(json({ snapshot, type: 'snapshot' }))).toEqual({ snapshot, type: 'snapshot' });
    const activity: RoomSnapshot = { ...snapshot, participants: [{ group: 0, id: 'a', status: 'activity' }], phase: 'activity' };
    expect(parseToHost(json({ snapshot: activity, type: 'snapshot' }))).toEqual({ snapshot: activity, type: 'snapshot' });
  });

  it('rejects a snapshot with a malformed participant or group', () => {
    const badParticipant = { ...snapshot, participants: [{ group: -1, id: 'a', status: 'matched' }] };
    const badGroup = { ...snapshot, groups: [{ cue: { type: 'colour' }, found: 0, size: 1 }] };
    expect(parseToHost(json({ snapshot: badParticipant, type: 'snapshot' }))).toBeNull();
    expect(parseToHost(json({ snapshot: badGroup, type: 'snapshot' }))).toBeNull();
  });
});
