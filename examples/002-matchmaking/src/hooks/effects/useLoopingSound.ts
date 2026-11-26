import { unlockedAudio } from '@playtest-kit/common';
import { useEffect, useState } from 'react';

/**
 * `playing` once the loop has started; `unavailable` with no unlocked audio, or if the file won't load
 * or decode (the page says so, and names the cue instead).
 */
export type SoundStatus = 'loading' | 'playing' | 'unavailable';

const buffers = new Map<string, Promise<AudioBuffer>>();

/** The decoded file at `url`, fetched once per page however often it plays. */
function load(context: AudioContext, url: string): Promise<AudioBuffer> {
  let buffer = buffers.get(url);
  if (!buffer) {
    buffer = fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`${url}: HTTP ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data));
    buffers.set(url, buffer);
    buffer.catch(() => buffers.delete(url));
  }
  return buffer;
}

/**
 * Plays the sound at `url` on a loop while mounted, through the AudioContext a tap unlocked (see
 * `unlockAudio`), so it starts with no tap of its own, on iOS too. Stops on unmount or when `url` changes.
 */
export function useLoopingSound(url: string): SoundStatus {
  const [outcome, setOutcome] = useState<{ url: string; status: SoundStatus } | null>(null);
  const context = unlockedAudio();

  useEffect(() => {
    if (!context) {
      return;
    }
    let source: AudioBufferSourceNode | null = null;
    let stopped = false;
    load(context, url).then(
      (buffer) => {
        if (stopped) {
          return;
        }
        source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(context.destination);
        void context.resume();
        source.start();
        setOutcome({ status: 'playing', url });
      },
      () => setOutcome({ status: 'unavailable', url }),
    );
    return () => {
      stopped = true;
      source?.stop();
    };
  }, [context, url]);

  if (!context) {
    return 'unavailable';
  }
  return outcome?.url === url ? outcome.status : 'loading';
}
