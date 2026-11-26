import { describe, expect, it } from 'vitest';
import { assignCues } from '../cues/cueTypes.ts';
import { seededRng } from '../matching/rng.ts';
import { INITIAL_ROOM_STATE, reduce } from './matchRoom.ts';
import type { RoomEvent, RoomState } from './matchRoom.ts';
import { snapshotOf, viewFor } from './roomSelectors.ts';

const deps = { assignCues, rng: seededRng(1) };

function run(events: ReadonlyArray<RoomEvent>, from: RoomState = INITIAL_ROOM_STATE): RoomState {
  return events.reduce((state, event) => reduce(state, event, deps), from);
}

/** `ids` joined and tapped Start. */
const readied = (...ids: Array<string>): Array<RoomEvent> =>
  ids.flatMap((id) => [
    { id, type: 'join' },
    { id, type: 'ready' },
  ]);

/** Move on twice: from the round to the activity, then back to the lobby. */
const toLobby: Array<RoomEvent> = [{ type: 'moveOn' }, { type: 'moveOn' }];

const pairs: RoomEvent = { config: { algorithm: 'random', cue: 'colour', grouping: { by: 'size', size: 2 } }, type: 'config' };

/** Someone else in `id`'s group. */
function partnerOf(state: RoomState, id: string): string {
  const { group } = state.participants.find((p) => p.id === id) ?? {};
  const partner = state.participants.find((p) => p.group === group && p.id !== id);
  if (!partner) {
    throw new Error(`${id} has no partner`);
  }
  return partner.id;
}

describe('reduce', () => {
  it('rejects a start with no one ready', () => {
    const state = run([{ id: 'a', type: 'join' }]);
    expect(run([{ type: 'start' }], state)).toBe(state);
  });

  it('matches everyone ready into groups, each with its own cue', () => {
    const state = run([pairs, ...readied('a', 'b', 'c', 'd'), { type: 'start' }]);
    expect(state.phase).toBe('round');
    expect(state.round).toBe(1);
    expect(state.groups).toHaveLength(2);
    expect(new Set(state.groups.map((cue) => JSON.stringify(cue))).size).toBe(2);
    expect(viewFor(state, 'a')).toMatchObject({ group: { found: 0, size: 2 }, status: 'matched' });
  });

  it('leaves out anyone still on the start screen', () => {
    const state = run([...readied('a', 'b'), { id: 'c', type: 'join' }, { type: 'start' }]);
    expect(viewFor(state, 'c')).toEqual({ status: 'joined' });
  });

  it('counts a found tap for everyone in the group, once', () => {
    const started = run([pairs, ...readied('a', 'b', 'c', 'd'), { type: 'start' }]);
    const state = run(
      [
        { id: 'a', type: 'found' },
        { id: 'a', type: 'found' },
      ],
      started,
    );
    expect(viewFor(state, 'a')).toMatchObject({ group: { found: 1, size: 2 }, status: 'found' });
    expect(viewFor(state, partnerOf(state, 'a'))).toMatchObject({ group: { found: 1, size: 2 }, status: 'matched' });
    expect(snapshotOf(state).groups.map((g) => g.found).toSorted((a, b) => a - b)).toEqual([0, 1]);
  });

  it('makes anyone ready after the start late, and matches them next round', () => {
    const late = run([...readied('a', 'b'), { type: 'start' }, ...readied('c')]);
    expect(viewFor(late, 'c')).toEqual({ status: 'late' });
    const next = run([...toLobby, { type: 'start' }], late);
    expect(viewFor(next, 'c').status).toBe('matched');
  });

  it('keeps the group and cue of someone who leaves mid-round and comes back', () => {
    const started = run([pairs, ...readied('a', 'b', 'c', 'd'), { type: 'start' }, { id: 'a', type: 'found' }]);
    const back = run(
      [
        { id: 'a', type: 'leave' },
        { id: 'a', type: 'join' },
      ],
      started,
    );
    expect(viewFor(back, 'a')).toEqual(viewFor(started, 'a'));
  });

  it('drops a leaver from the counts', () => {
    const started = run([pairs, ...readied('a', 'b', 'c', 'd'), { type: 'start' }, { id: 'a', type: 'found' }]);
    const partner = partnerOf(started, 'a');
    const state = run([{ id: 'a', type: 'leave' }], started);
    expect(viewFor(state, partner)).toMatchObject({ group: { found: 0, size: 1 } });
    expect(snapshotOf(state).participants.map((p) => p.id)).not.toContain('a');
  });

  it('forgets someone who leaves the lobby', () => {
    const state = run([...readied('a'), { id: 'a', type: 'leave' }]);
    expect(state.participants).toEqual([]);
  });

  it('moves every group on to the activity, keeping its cue, whether or not they found each other', () => {
    const started = run([pairs, ...readied('a', 'b', 'c', 'd'), { type: 'start' }, { id: 'a', type: 'found' }]);
    const state = run([{ type: 'moveOn' }], started);
    expect(state.phase).toBe('activity');
    expect(state.groups).toEqual(started.groups);
    for (const id of ['a', 'b', 'c', 'd']) {
      const { group } = started.participants.find((p) => p.id === id) ?? {};
      expect(viewFor(state, id)).toMatchObject({ cue: started.groups[group ?? -1], group: { size: 2 }, status: 'activity' });
    }
  });

  it('keeps someone who leaves during the activity, so they come back to it', () => {
    const activity = run([...readied('a', 'b'), { type: 'start' }, { type: 'moveOn' }]);
    const back = run(
      [
        { id: 'a', type: 'leave' },
        { id: 'a', type: 'join' },
      ],
      activity,
    );
    expect(viewFor(back, 'a')).toEqual(viewFor(activity, 'a'));
  });

  it('returns everyone to waiting when the activity ends', () => {
    const state = run([...readied('a', 'b', 'c'), { type: 'start' }, { id: 'a', type: 'found' }, ...toLobby]);
    expect(state.phase).toBe('lobby');
    expect(state.round).toBe(1);
    expect(state.groups).toEqual([]);
    expect(['a', 'b', 'c'].map((id) => viewFor(state, id))).toEqual(Array.from({ length: 3 }, () => ({ status: 'waiting' })));
  });

  it('returns everyone to waiting on reset, and starts the round count again', () => {
    const state = run([...readied('a', 'b'), { type: 'start' }, { type: 'reset' }]);
    expect(state.phase).toBe('lobby');
    expect(state.round).toBe(0);
    expect(viewFor(state, 'a')).toEqual({ status: 'waiting' });
  });

  it('forgets anyone gone at the end of a round', () => {
    const state = run([...readied('a', 'b'), { type: 'start' }, { id: 'a', type: 'leave' }, ...toLobby]);
    expect(state.participants.map((p) => p.id)).toEqual(['b']);
  });

  it('applies a config change made mid-round to the next round', () => {
    const started = run([pairs, ...readied('a', 'b', 'c', 'd'), { type: 'start' }]);
    const changed = run([{ config: { ...started.config, grouping: { by: 'count', count: 1 } }, type: 'config' }], started);
    expect(changed.groups).toEqual(started.groups);
    expect(run([...toLobby, { type: 'start' }], changed).groups).toHaveLength(1);
  });

  it('ignores a found tap outside a round, a start outside the lobby, and move on in the lobby', () => {
    const lobby = run(readied('a'));
    expect(run([{ id: 'a', type: 'found' }], lobby)).toBe(lobby);
    expect(run([{ type: 'moveOn' }], lobby)).toBe(lobby);
    const started = run([{ type: 'start' }], lobby);
    expect(run([{ type: 'start' }], started)).toBe(started);
    const activity = run([{ type: 'moveOn' }], started);
    expect(run([{ type: 'start' }], activity)).toBe(activity);
    expect(run([{ id: 'a', type: 'found' }], activity)).toBe(activity);
  });
});

describe('snapshotOf', () => {
  it('lists everyone connected with their status and group', () => {
    const state = run([...readied('a', 'b'), { id: 'c', type: 'join' }]);
    expect(snapshotOf(state)).toMatchObject({
      groups: [],
      participants: [
        { group: null, id: 'a', status: 'waiting' },
        { group: null, id: 'b', status: 'waiting' },
        { group: null, id: 'c', status: 'joined' },
      ],
      phase: 'lobby',
    });
  });
});
