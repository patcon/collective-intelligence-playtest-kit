import { useOnChange } from '@playtest-kit/common';
import { connectToRoom, useSimCrowd } from '@playtest-kit/common/simulation';
import { AGENT, ROOM } from '../room/protocol.ts';
import { DEFAULT_SIMS, QuizCrowd } from './QuizCrowd.ts';
import type { QuizCrowdState } from './QuizCrowd.ts';

export interface Simulation extends QuizCrowdState {
  setCount: (count: number) => void;
  setMaxSkipped: (maxSkipped: number | null) => void;
}

/** This page's simulated participants, `DEFAULT_SIMS` of them to begin with, for as long as the calling component is mounted. */
export function useSimulation(): Simulation {
  const { crowd, state } = useSimCrowd(() => new QuizCrowd(connectToRoom(AGENT, ROOM)));
  useOnChange(crowd, (mounted) => mounted.setCount(DEFAULT_SIMS));

  return {
    ...state,
    setCount: (count) => crowd.setCount(count),
    setMaxSkipped: (maxSkipped) => crowd.setMaxSkipped(maxSkipped),
  };
}
