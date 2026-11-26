import { isCue } from '../cues/cueTypes.ts';
import type { Cue } from '../cues/cueTypes.ts';
import { isMatchConfig } from './matchConfig.ts';
import type { MatchConfig } from './matchConfig.ts';

/** `lobby` between rounds, `round` while groups look for each other, `activity` once they've moved on to what follows. */
export type Phase = 'lobby' | 'round' | 'activity';

/**
 * Where a participant is: `joined` (connected, still on the start screen), `waiting` (ready for the
 * next round), `late` (ready, but joined after this round's groups were made), `matched` (in a group,
 * looking for it), `found` (in a group, and tapped "found them") or `activity` (in a group, now doing
 the activity that follows matching).
 */
export type ParticipantStatus = 'joined' | 'waiting' | 'late' | 'matched' | 'found' | 'activity';

/** The statuses of someone in a group, whose view carries the group's cue and progress. */
export type GroupedStatus = 'matched' | 'found' | 'activity';

const GROUPED: ReadonlySet<unknown> = new Set<GroupedStatus>(['matched', 'found', 'activity']);

export function isGroupedStatus(status: ParticipantStatus): status is GroupedStatus {
  return GROUPED.has(status);
}

/** How many are in a group now, and how many of them have tapped "found them". */
export interface GroupProgress {
  size: number;
  found: number;
}

/** What one participant's screen shows. */
export type ParticipantView =
  | { status: 'joined' | 'waiting' | 'late' }
  | { status: GroupedStatus; cue: Cue; group: GroupProgress };

export interface ParticipantSummary {
  id: string;
  status: ParticipantStatus;
  /** Index into `groups`, or null when not in one. */
  group: number | null;
}

export interface GroupSummary extends GroupProgress {
  cue: Cue;
}

/** Everything the host sees: the whole room, as it is now. */
export interface RoomSnapshot {
  phase: Phase;
  /** Rounds started so far. A round undone with Back doesn't count. */
  round: number;
  config: MatchConfig;
  /** The config this round was made with, or null in the lobby. */
  roundConfig: MatchConfig | null;
  participants: Array<ParticipantSummary>;
  groups: Array<GroupSummary>;
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isGroupProgress(value: unknown): value is GroupProgress {
  return isObject(value) && 'size' in value && isCount(value.size) && 'found' in value && isCount(value.found);
}

function isGroupSummary(value: unknown): value is GroupSummary {
  return isGroupProgress(value) && 'cue' in value && isCue(value.cue);
}

const STATUSES: ReadonlySet<unknown> = new Set<ParticipantStatus>(['joined', 'waiting', 'late', 'matched', 'found', 'activity']);

function isStatus(value: unknown): value is ParticipantStatus {
  return STATUSES.has(value);
}

export function isParticipantView(value: unknown): value is ParticipantView {
  if (!isObject(value) || !('status' in value) || !isStatus(value.status)) {
    return false;
  }
  if (!isGroupedStatus(value.status)) {
    return true;
  }
  return 'cue' in value && isCue(value.cue) && 'group' in value && isGroupProgress(value.group);
}

function isParticipantSummary(value: unknown): value is ParticipantSummary {
  return (
    isObject(value) &&
    'id' in value &&
    typeof value.id === 'string' &&
    'status' in value &&
    isStatus(value.status) &&
    'group' in value &&
    (value.group === null || isCount(value.group))
  );
}

function isListOf<T>(value: unknown, isItem: (item: unknown) => item is T): value is Array<T> {
  return Array.isArray(value) && value.every((item) => isItem(item));
}

function hasConfigs(value: unknown): value is Pick<RoomSnapshot, 'config' | 'roundConfig'> {
  return isObject(value) && 'config' in value && isMatchConfig(value.config) && 'roundConfig' in value && (value.roundConfig === null || isMatchConfig(value.roundConfig));
}

function hasRoomHeader(value: unknown): value is Pick<RoomSnapshot, 'phase' | 'round' | 'config' | 'roundConfig'> {
  return (
    isObject(value) &&
    'phase' in value &&
    (value.phase === 'lobby' || value.phase === 'round' || value.phase === 'activity') &&
    'round' in value &&
    isCount(value.round) &&
    hasConfigs(value)
  );
}

export function isRoomSnapshot(value: unknown): value is RoomSnapshot {
  return (
    hasRoomHeader(value) &&
    'participants' in value &&
    isListOf(value.participants, isParticipantSummary) &&
    'groups' in value &&
    isListOf(value.groups, isGroupSummary)
  );
}
