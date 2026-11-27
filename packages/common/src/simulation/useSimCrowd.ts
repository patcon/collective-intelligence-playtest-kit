import { useState, useSyncExternalStore } from 'react';
import { useDisposeOnUnmount } from '../hooks/effects/useDisposeOnUnmount.ts';

/** A store of sims that can be read by React and closed. `SimCrowd`, or an example's crowd built on it. */
export interface CrowdStore<T> {
  subscribe: (listener: () => void) => () => void;
  getState: () => T;
  dispose: () => void;
}

export interface OwnedCrowd<C, T> {
  crowd: C;
  state: T;
}

/** A crowd made by `create`, kept for as long as the calling component is mounted, and its current state. */
export function useSimCrowd<T, C extends CrowdStore<T>>(create: () => C & CrowdStore<T>): OwnedCrowd<C, T> {
  const [crowd] = useState(create);
  useDisposeOnUnmount(crowd);
  const state = useSyncExternalStore(crowd.subscribe, crowd.getState);
  return { crowd, state };
}
