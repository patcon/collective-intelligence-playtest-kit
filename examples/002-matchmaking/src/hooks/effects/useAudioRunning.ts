import { unlockedAudio } from '@playtest-kit/common';
import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  const context = unlockedAudio();
  context?.addEventListener('statechange', onChange);
  return () => context?.removeEventListener('statechange', onChange);
}

function isRunning(): boolean {
  return unlockedAudio()?.state === 'running';
}

/**
 * Whether this page can play sound now: a tap has unlocked its AudioContext (see `unlockAudio`) and
 * the browser hasn't suspended it since. Re-renders when that changes.
 */
export function useAudioRunning(): boolean {
  return useSyncExternalStore(subscribe, isRunning);
}
