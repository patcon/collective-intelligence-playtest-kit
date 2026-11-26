import type { Vibration } from 'web-haptics';

/**
 * The sound of a phone vibrating, for phones that can't (iPhones): a rattle of tiny clicks through
 * each buzz, faster the stronger it is. It's the click `web-haptics` plays in its `debug` mode
 * (as `polislike-partykit-reaction-canvas` uses on Apple devices), rebuilt here on the AudioContext
 * the start screen's tap unlocked, since iOS keeps a context made later, without a tap, silent.
 */

/** Gaps between clicks, in ms: this at full strength, up to this plus `CLICK_GAP_RANGE_MS` at none. */
const MIN_CLICK_GAP_MS = 16;
const CLICK_GAP_RANGE_MS = 184;
const CLICK_LENGTH_S = 0.004;

export interface Click {
  /** Seconds after the pattern starts. */
  at: number;
  /** 0–1. */
  intensity: number;
}

/** When each click falls in `pattern`, and how hard. */
export function clickTimes(pattern: ReadonlyArray<Vibration>): Array<Click> {
  const clicks: Array<Click> = [];
  let t = 0;
  for (const { delay = 0, duration, intensity = 0.5 } of pattern) {
    t += delay;
    const gap = MIN_CLICK_GAP_MS + (1 - intensity) * CLICK_GAP_RANGE_MS;
    for (let at = 0; at < duration; at += gap) {
      clicks.push({ at: (t + at) / 1000, intensity });
    }
    t += duration;
  }
  return clicks;
}

const noise = new WeakMap<BaseAudioContext, AudioBuffer>();

/** A click's sound: a burst of noise that dies away in a few ms. Made once per context. */
function clickBuffer(context: BaseAudioContext): AudioBuffer {
  let buffer = noise.get(context);
  if (!buffer) {
    buffer = context.createBuffer(1, Math.ceil(context.sampleRate * CLICK_LENGTH_S), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 25);
    }
    noise.set(context, buffer);
  }
  return buffer;
}

/** Plays `pattern` as buzzing, starting now. Returns a function that stops what hasn't played yet. */
export function playBuzz(context: AudioContext, pattern: ReadonlyArray<Vibration>): () => void {
  const buffer = clickBuffer(context);
  const start = context.currentTime;
  const sources = clickTimes(pattern).map(({ at, intensity }) => {
    const source = context.createBufferSource();
    source.buffer = buffer;
    // Pitched a little differently each time, as in `web-haptics`, so it rattles rather than beeps.
    const filter = new BiquadFilterNode(context, { Q: 8, frequency: (2000 + intensity * 2000) * (1 + (Math.random() - 0.5) * 0.3), type: 'bandpass' });
    const gain = new GainNode(context, { gain: intensity });
    source.connect(filter).connect(gain).connect(context.destination);
    source.start(start + at);
    return source;
  });
  return () => {
    for (const source of sources) {
      source.stop();
    }
  };
}
