import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './matchConfig.ts';
import { parseHostMessage, parseParticipantMessage, parseToHost, parseToParticipant } from './protocol.ts';
import type { RoomSnapshot } from './protocol.ts';

const json = (value: unknown) => JSON.stringify(value);
const cue = { hex: '#e6194b', name: 'Red', type: 'colour' } as const;

describe('parseParticipantMessage', () => {
  it('reads ready and found', () => {
    expect(parseParticipantMessage(json({ type: 'ready' }))).toEqual({ type: 'ready' });
    expect(parseParticipantMessage(json({ extra: 1, type: 'found' }))).toEqual({ type: 'found' });
  });

  it('rejects anything else', () => {
    for (const raw of ['not json', json(null), json([]), json({ type: 'start' }), json({})]) {
      expect(parseParticipantMessage(raw)).toBeNull();
    }
  });
});

describe('parseHostMessage', () => {
  it('reads the round controls and a valid config', () => {
    expect(parseHostMessage(json({ type: 'moveOn' }))).toEqual({ type: 'moveOn' });
    expect(parseHostMessage(json({ config: DEFAULT_CONFIG, type: 'config' }))).toEqual({ config: DEFAULT_CONFIG, type: 'config' });
  });

  it('rejects a config with a bad grouping, algorithm or cue', () => {
    const bad = [
      { ...DEFAULT_CONFIG, grouping: { by: 'size', size: 1 } },
      { ...DEFAULT_CONFIG, grouping: { by: 'count', count: 2.5 } },
      { ...DEFAULT_CONFIG, grouping: { by: 'size', size: 1000 } },
      { ...DEFAULT_CONFIG, grouping: { by: 'bogus' } },
      { ...DEFAULT_CONFIG, algorithm: 'smart' },
      { ...DEFAULT_CONFIG, cue: 'smell' },
      { ...DEFAULT_CONFIG, cue: 'toString' },
    ];
    for (const config of bad) {
      expect(parseHostMessage(json({ config, type: 'config' }))).toBeNull();
    }
  });
});

describe('parseToParticipant', () => {
  it('reads a view with and without a group', () => {
    const matched = { cue, group: { found: 1, size: 3 }, status: 'matched' };
    expect(parseToParticipant(json({ type: 'view', view: matched }))).toEqual({ type: 'view', view: matched });
    expect(parseToParticipant(json({ type: 'view', view: { status: 'late' } }))).toEqual({ type: 'view', view: { status: 'late' } });
  });

  it('rejects a matched view with no cue, and an unknown status', () => {
    expect(parseToParticipant(json({ type: 'view', view: { group: { found: 0, size: 2 }, status: 'matched' } }))).toBeNull();
    expect(parseToParticipant(json({ type: 'view', view: { status: 'dancing' } }))).toBeNull();
  });
});

describe('parseToHost', () => {
  const snapshot: RoomSnapshot = {
    config: DEFAULT_CONFIG,
    groups: [{ cue, found: 0, size: 1 }],
    participants: [{ group: 0, id: 'a', status: 'matched' }],
    phase: 'round',
    round: 1,
  };

  it('reads a snapshot', () => {
    expect(parseToHost(json({ snapshot, type: 'snapshot' }))).toEqual({ snapshot, type: 'snapshot' });
  });

  it('rejects a snapshot with a malformed participant or group', () => {
    const badParticipant = { ...snapshot, participants: [{ group: -1, id: 'a', status: 'matched' }] };
    const badGroup = { ...snapshot, groups: [{ cue: { type: 'colour' }, found: 0, size: 1 }] };
    expect(parseToHost(json({ snapshot: badParticipant, type: 'snapshot' }))).toBeNull();
    expect(parseToHost(json({ snapshot: badGroup, type: 'snapshot' }))).toBeNull();
  });
});
