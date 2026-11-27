import { connectToRoom, useSimCrowd } from '@playtest-kit/common/simulation';
import { AGENT } from '../room/protocol.ts';
import { SimulatedCrowd } from './SimulatedCrowd.ts';
import type { CrowdState } from './SimulatedCrowd.ts';

export interface Simulation extends CrowdState {
  setCount: (count: number) => void;
  setAutoConfirm: (on: boolean) => void;
  found: (id: string) => void;
}

/** Simulated participants in `room`, for as long as the calling component is mounted. */
export function useSimulation(room: string): Simulation {
  const { crowd, state } = useSimCrowd(() => new SimulatedCrowd(connectToRoom(AGENT, room)));

  return {
    ...state,
    found: (id) => crowd.found(id),
    setAutoConfirm: (on) => crowd.setAutoConfirm(on),
    setCount: (count) => crowd.setCount(count),
  };
}
