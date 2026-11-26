// PROTOTYPE (throwaway): one number set by the emcee, the other calculated from who's ready.
// The −/+ only stop at 2 groups (one group isn't a split) and 2 per group, so the emcee can set things before people arrive;
// a setting the people ready can't make is reported as `problem`, which blocks Start.
import { useState } from 'react';
import { MIN_GROUP_SIZE } from '../../matching/match.ts';
import { MIN_GROUPS, sizesForSize, sizesOf } from './divideMaths.ts';
import type { Leftovers, Locked } from './divideMaths.ts';

export interface Division {
  ready: number;
  /** How many groups the cue can tell apart. */
  cueMax: number;
  locked: Locked;
  leftovers: Leftovers;
  groups: number;
  sizes: Array<number>;
  /** The people-per-group number the emcee set (meaningful while `locked` is 'size'). */
  size: number;
  /** Why the people ready can't be split this way, or null. Only once at least 2 are ready. */
  problem: string | null;
  /** Whether group `i` is a concern: the only group, short of a pair or of the people per group set, or past what the cue can tell apart. */
  isConcern: (i: number) => boolean;
  canStep: (which: Locked, delta: 1 | -1) => boolean;
  /** Steps `which` by one, making it the number the emcee sets. */
  step: (which: Locked, delta: 1 | -1) => void;
  setLocked: (which: Locked) => void;
  setLeftovers: (leftovers: Leftovers) => void;
}

function problemOf(ready: number, sizes: ReadonlyArray<number>, cueMax: number, min: number | null): string | null {
  const groups = sizes.length;
  if (ready < MIN_GROUP_SIZE) {
    return null;
  }
  if (groups < MIN_GROUPS) {
    return `${ready} ready make only one group, which isn't a split.`;
  }
  if (groups > cueMax) {
    return `This cue can tell only ${cueMax} groups apart.`;
  }
  if (Math.floor(ready / groups) < MIN_GROUP_SIZE) {
    return `${ready} ready can't make ${groups} groups without someone on their own.`;
  }
  if (min !== null && Math.min(...sizes) < min) {
    return `${ready} ready can't make ${groups} groups of at least ${min}.`;
  }
  return null;
}

/** Which leftovers choice a variant uses: D's "aim for / at least", or E's "min / max / smart". */
export type LeftoversFamily = 'aim' | 'fit';

export function useDivision(ready: number, cueMax: number, family: LeftoversFamily): Division {
  const [locked, setLockedState] = useState<Locked>('groups');
  const [groupsSet, setGroupsSet] = useState(3);
  const [sizeSet, setSizeSet] = useState(3);
  // Each family of variants keeps its own choice: D's "aim for / at least" and E's "min / max / smart".
  const [aimChoice, setAimChoice] = useState<Leftovers>('aimFor');
  const [fitChoice, setFitChoice] = useState<Leftovers>('nearest');
  const leftovers = family === 'fit' ? fitChoice : aimChoice;
  const setLeftovers = family === 'fit' ? setFitChoice : setAimChoice;

  const sizes = locked === 'groups' ? sizesOf(ready, groupsSet) : sizesForSize(ready, sizeSet, leftovers);
  const groups = sizes.length;

  // A newly set number starts from what it showed while calculated, so the first press moves by one.
  const current = (which: Locked) => {
    if (which === 'groups') {
      return Math.max(1, groups);
    }
    return which === locked || sizes.length === 0 ? sizeSet : Math.max(MIN_GROUP_SIZE, Math.min(...sizes));
  };
  const canStep = (which: Locked, delta: 1 | -1) => current(which) + delta >= (which === 'groups' ? MIN_GROUPS : MIN_GROUP_SIZE);

  const step = (which: Locked, delta: 1 | -1) => {
    if (canStep(which, delta)) {
      (which === 'groups' ? setGroupsSet : setSizeSet)(current(which) + delta);
      setLockedState(which);
    }
  };

  const setLocked = (which: Locked) => {
    (which === 'groups' ? setGroupsSet : setSizeSet)(which === 'groups' ? Math.max(MIN_GROUPS, current(which)) : current(which));
    setLockedState(which);
  };

  // Short of the people per group set is flagged when it's a target ("aim for") or a minimum ("min"),
  // for the emcee to judge. Only a minimum blocks Start: a target is a hope, a minimum isn't.
  const aim = locked === 'size' && (leftovers === 'aimFor' || leftovers === 'atLeast') ? sizeSet : null;
  const isConcern = (i: number) => {
    const groupSize = sizes[i] ?? 0;
    return groups < MIN_GROUPS || groupSize < MIN_GROUP_SIZE || (aim !== null && groupSize < aim) || i >= cueMax;
  };
  const problem = problemOf(ready, sizes, cueMax, locked === 'size' && leftovers === 'atLeast' ? sizeSet : null);
  return { canStep, cueMax, groups, isConcern, leftovers, locked, problem, ready, setLeftovers, setLocked, size: sizeSet, sizes, step };
}
