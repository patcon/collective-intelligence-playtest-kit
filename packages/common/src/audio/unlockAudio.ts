let context: AudioContext | null = null;

/**
 * Creates (once) and resumes the page's AudioContext. Call it from a tap: iOS and Chrome only let
 * audio start from a user gesture, after which the context can play whenever. Playing a silent
 * sample in the same tap is what unlocks older iOS. Does nothing where Web Audio is missing.
 */
export function unlockAudio(): void {
  if (typeof AudioContext === 'undefined') {
    return;
  }
  context ??= new AudioContext();
  void context.resume();
  const silence = context.createBufferSource();
  silence.buffer = context.createBuffer(1, 1, context.sampleRate);
  silence.connect(context.destination);
  silence.start();
}

/** The AudioContext a tap unlocked, or null before one has. */
export function unlockedAudio(): AudioContext | null {
  return context;
}
