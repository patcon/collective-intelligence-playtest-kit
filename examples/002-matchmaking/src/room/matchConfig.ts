import { isCueTypeId } from '../cues/cueTypes.ts';
import type { CueTypeId } from '../cues/cueTypes.ts';
import type { Algorithm, Grouping } from '../matching/match.ts';

/** How the next round is matched and cued. Set from the host; a change mid-round applies to the next one. */
export interface MatchConfig {
  algorithm: Algorithm;
  grouping: Grouping;
  cue: CueTypeId;
}

export const DEFAULT_CONFIG: MatchConfig = { algorithm: 'random', cue: 'colour', grouping: { by: 'size', size: 3 } };

/** The most people a room expects, and so the largest group size or count worth asking for. */
export const MAX_GROUPING = 50;

function isWhole(value: unknown, min: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= MAX_GROUPING;
}

function isGrouping(value: unknown): value is Grouping {
  if (typeof value !== 'object' || value === null || !('by' in value)) {
    return false;
  }
  if (value.by === 'size') {
    return 'size' in value && isWhole(value.size, 2);
  }
  return value.by === 'count' && 'count' in value && isWhole(value.count, 1);
}

export function isMatchConfig(value: unknown): value is MatchConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    'algorithm' in value &&
    value.algorithm === 'random' &&
    'grouping' in value &&
    isGrouping(value.grouping) &&
    'cue' in value &&
    isCueTypeId(value.cue)
  );
}
