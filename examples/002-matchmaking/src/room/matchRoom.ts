import type { Cue, CueTypeId } from '../cues/cueTypes.ts';
import { match, MIN_GROUP_SIZE, smallestGroupSize } from '../matching/match.ts';
import type { Rng } from '../matching/rng.ts';
import { DEFAULT_CONFIG } from './matchConfig.ts';
import type { MatchConfig } from './matchConfig.ts';
import type { Phase } from './roomViews.ts';

export interface Participant {
  /** The connection id, which `/participate` keeps per tab, so a reload comes back as the same person. */
  id: string;
  connected: boolean;
  /** Past the start screen. Only ready participants are matched. */
  ready: boolean;
  /** Index into `RoomState.groups` this round, or null. */
  group: number | null;
  found: boolean;
}

/** The whole room. Plain data, so the Agent can keep it with `setState` and it outlasts hibernation. */
export interface RoomState {
  phase: Phase;
  round: number;
  config: MatchConfig;
  participants: Array<Participant>;
  /** This round's groups, by their cue. Who's in each is on `participants`. */
  groups: Array<Cue>;
}

export type RoomEvent =
  | { type: 'join' | 'leave' | 'ready'; id: string }
  | { type: 'found'; id: string; found: boolean }
  | { type: 'config'; config: MatchConfig }
  | { type: 'start' | 'moveOn' | 'back' | 'reshuffle' };

/** What the reducer needs from outside: randomness, and how to cue each group. */
export interface RoomDeps {
  rng: Rng;
  assignCues: (type: CueTypeId, groupCount: number, rng: Rng) => Array<Cue>;
}

export const INITIAL_ROOM_STATE: RoomState = { config: DEFAULT_CONFIG, groups: [], participants: [], phase: 'lobby', round: 0 };

function withParticipant(state: RoomState, id: string, change: (p: Participant) => Participant): RoomState {
  if (!state.participants.some((p) => p.id === id)) {
    return state;
  }
  return { ...state, participants: state.participants.map((p) => (p.id === id ? change(p) : p)) };
}

/** A known id coming back keeps its place; a new one starts on the start screen. */
function join(state: RoomState, id: string): RoomState {
  if (state.participants.some((p) => p.id === id)) {
    return withParticipant(state, id, (p) => ({ ...p, connected: true }));
  }
  const joined: Participant = { connected: true, found: false, group: null, id, ready: false };
  return { ...state, participants: [...state.participants, joined] };
}

/** Someone in this round's groups is kept, out of the counts, in case they come back; anyone else is forgotten. */
function leave(state: RoomState, id: string): RoomState {
  const leaving = state.participants.find((p) => p.id === id);
  if (!leaving) {
    return state;
  }
  if (state.phase !== 'lobby' && leaving.group !== null) {
    return withParticipant(state, id, (p) => ({ ...p, connected: false }));
  }
  return { ...state, participants: state.participants.filter((p) => p.id !== id) };
}

/** Ticks or unticks "found them" for someone in a group, during a round only. */
function setFound(state: RoomState, id: string, found: boolean): RoomState {
  const finder = state.participants.find((p) => p.id === id);
  return state.phase === 'round' && finder && finder.group !== null && finder.found !== found
    ? withParticipant(state, id, (p) => ({ ...p, found }))
    : state;
}

/** Matches everyone connected and ready into the next round. Lobby only (see `matchReady`). */
function start(state: RoomState, deps: RoomDeps): RoomState {
  return state.phase === 'lobby' ? matchReady(state, state.round + 1, deps) : state;
}

/** New groups and cues for everyone ready, as the same round, from a round or the activity. */
function reshuffle(state: RoomState, deps: RoomDeps): RoomState {
  return state.phase === 'lobby' ? state : matchReady(state, state.round, deps);
}

/**
 * Round `round`, with new groups for everyone connected and ready, each group with its own cue, and
 * anyone gone forgotten. Returns `state` itself if anyone would be in a group of one.
 */
function matchReady(state: RoomState, round: number, { assignCues, rng }: RoomDeps): RoomState {
  const ids = state.participants.filter((p) => p.connected && p.ready).map((p) => p.id);
  if (smallestGroupSize(ids.length, state.config.grouping) < MIN_GROUP_SIZE) {
    return state;
  }
  const groups = match(ids, state.config, rng);
  const groupOf = new Map(groups.flatMap((members, g) => members.map((id) => [id, g] as const)));
  return {
    ...state,
    groups: assignCues(state.config.cue, groups.length, rng),
    participants: state.participants.filter((p) => p.connected).map((p) => ({ ...p, found: false, group: groupOf.get(p.id) ?? null })),
    phase: 'round',
    round,
  };
}

/** Back to the lobby: groups gone, everyone still here waiting, anyone gone forgotten. */
function toLobby(state: RoomState, round: number): RoomState {
  return {
    ...state,
    groups: [],
    participants: state.participants.filter((p) => p.connected).map((p) => ({ ...p, found: false, group: null })),
    phase: 'lobby',
    round,
  };
}

/** From a round, groups move on to the activity, keeping their cue; from the activity, back to the lobby. */
function moveOn(state: RoomState): RoomState {
  switch (state.phase) {
    case 'lobby':
      return state;
    case 'round':
      return { ...state, phase: 'activity' };
    case 'activity':
      return toLobby(state, state.round);
  }
}

/** One step back: from the activity to its round, groups and ticks kept; from a round to the lobby, as if it hadn't started. */
function back(state: RoomState): RoomState {
  switch (state.phase) {
    case 'lobby':
      return state;
    case 'round':
      return toLobby(state, state.round - 1);
    case 'activity':
      return { ...state, phase: 'round' };
  }
}

/**
 * The room's next state after `event`. Pure: the same state, event and deps always give the same
 * result, and an event that doesn't apply returns `state` itself.
 */
export function reduce(state: RoomState, event: RoomEvent, deps: RoomDeps): RoomState {
  switch (event.type) {
    case 'join':
      return join(state, event.id);
    case 'leave':
      return leave(state, event.id);
    case 'ready':
      return withParticipant(state, event.id, (p) => ({ ...p, ready: true }));
    case 'found':
      return setFound(state, event.id, event.found);
    case 'config':
      return { ...state, config: event.config };
    case 'start':
      return start(state, deps);
    case 'moveOn':
      return moveOn(state);
    case 'back':
      return back(state);
    case 'reshuffle':
      return reshuffle(state, deps);
  }
}
