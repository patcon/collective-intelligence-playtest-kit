import { isCueTypeId } from '../cues/cueTypes.ts';
import type { CueTypeId } from '../cues/cueTypes.ts';
import { FITS } from '../matching/match.ts';
import type { Algorithm, Grouping } from '../matching/match.ts';

/**
 * How the next round is matched and cued, and what phones show. Set from the host; a change mid-round
 * applies to the next one, except `showFoundCount`, which phones pick up straight away.
 */
export interface MatchConfig {
  algorithm: Algorithm;
  grouping: Grouping;
  cue: CueTypeId;
  /** Whether a phone with a cue shows "x found" in its group. */
  showFoundCount: boolean;
}

export const DEFAULT_CONFIG: MatchConfig = { algorithm: 'random', cue: 'colour', grouping: { by: 'groupSize', fit: 'smart', groupSize: 3 }, showFoundCount: false };

/** The most people a room expects, and so the largest group size or count worth asking for. */
export const MAX_GROUPING = 50;

function isWhole(value: unknown, min: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= MAX_GROUPING;
}

function isGrouping(value: unknown): value is Grouping {
  if (typeof value !== 'object' || value === null || !('by' in value)) {
    return false;
  }
  if (value.by === 'groupSize') {
    return 'groupSize' in value && isWhole(value.groupSize, 2) && 'fit' in value && (FITS as ReadonlyArray<unknown>).includes(value.fit);
  }
  return value.by === 'groupCount' && 'groupCount' in value && isWhole(value.groupCount, 1);
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
    isCueTypeId(value.cue) &&
    'showFoundCount' in value &&
    typeof value.showFoundCount === 'boolean'
  );
}
