import { useState } from 'react';
import type { PointerEvent } from 'react';
import { useDeviceOrientation } from '../hooks/effects/useDeviceOrientation.ts';
import type { OrientationStatus } from '../hooks/effects/useDeviceOrientation.ts';
import { useInterval } from '../hooks/effects/useInterval.ts';
import { useWakeLock } from '../hooks/effects/useWakeLock.ts';
import { RemoteScreen } from './components/RemoteScreen.tsx';
import { StartScreen } from './components/StartScreen.tsx';
import { TouchGuides } from './components/TouchGuides.tsx';
import { useActivity } from './hooks/useActivity.ts';
import type { Activity, IdleSettings } from './lib/activity.ts';
import { INSTRUCTIONS, ORIENTATION_NOTES } from './lib/instructions.ts';
import { createSender, SEND_MS } from './lib/sender.ts';
import type { Valence } from './lib/sender.ts';
import { detected, touchValence, upOf } from './lib/valence.ts';
import type { Detection } from './lib/valence.ts';

export interface ValenceRemoteProps {
  /** Throttled (~50 ms, epsilon 0.004) with a 1 s keepalive; null when it can't tell. */
  onValence: (valence: number | null) => void;
  /** On mount and whenever it changes: `arrived`, then `active` or `idle` (see `Activity`). */
  onActivity?: (activity: Activity) => void;
  /** When a tilt remote counts as idle, over DEFAULT_IDLE; read once on mount. */
  idle?: Partial<IdleSettings>;
  /** Turn the screen grey while idle, rather than keep the valence's colour. */
  greyWhenIdle?: boolean;
  /** How the phone reads as valence. Touch also works on desktop. */
  detection?: Detection;
  /** Keep the screen awake while running, via the Wake Lock API. */
  keepAwake?: boolean;
}

const START_WARNINGS: Partial<Record<OrientationStatus, string>> = {
  insecure: 'Tilt needs a secure (https) page, and this one isn’t.',
  unsupported: 'This browser can’t read tilt.',
};

function notesFor(touch: boolean, status: OrientationStatus, wakeLockLost: boolean): Array<string> {
  const orientationNote = touch ? null : ORIENTATION_NOTES[status];
  return [orientationNote, wakeLockLost ? 'The screen may sleep.' : null].filter((note) => note !== null);
}

/** Turns a phone into a remote: its orientation (or a finger's height) as a valence from −1 to +1. */
export function ValenceRemote({
  onValence,
  onActivity,
  idle,
  greyWhenIdle = false,
  detection = 'flip',
  keepAwake = true,
}: ValenceRemoteProps) {
  const [started, setStarted] = useState(false);
  const [valence, setValence] = useState<Valence>(null);
  const [fingerY, setFingerY] = useState<number | null>(null);
  const [sender] = useState(createSender);
  const touch = detection === 'touch';
  const wakeLock = useWakeLock(started && keepAwake);
  const { activity, tracker } = useActivity(started, onActivity, idle);

  const emit = (out: Valence | undefined) => {
    if (out !== undefined) {
      onValence(out);
    }
  };

  const report = (v: Valence) => {
    setValence(v);
    emit(sender.update(v, performance.now()));
  };

  const orientation = useDeviceOrientation(started && !touch, (beta, gamma) => {
    const up = upOf(beta, gamma);
    tracker.tilt(up, performance.now());
    if (detection !== 'touch') {
      report(up && detected(detection, up));
    }
  });

  useInterval(() => emit(sender.flush(performance.now())), SEND_MS, started);

  const start = () => {
    if (!touch) {
      void orientation.requestPermission();
      tracker.poke(performance.now());
    }
    setStarted(true);
    report(null);
  };

  const onPointer = (y: number, event: PointerEvent<HTMLDivElement>) => {
    if (event.type === 'pointerdown' || event.buttons > 0) {
      tracker.touch(true);
      setFingerY(y);
      report(touchValence(y));
    }
  };

  if (!started) {
    const warning = touch ? null : (START_WARNINGS[orientation.status] ?? null);
    return <StartScreen instruction={INSTRUCTIONS[detection]} onStart={start} warning={warning} />;
  }

  const wakeLockLost = keepAwake && !wakeLock.acquired;
  return (
    <RemoteScreen
      grey={greyWhenIdle && activity === 'idle'}
      instruction={INSTRUCTIONS[detection]}
      notes={notesFor(touch, orientation.status, wakeLockLost)}
      onPointer={touch ? onPointer : undefined}
      onRelease={() => tracker.touch(false)}
      valence={valence}
    >
      {touch && <TouchGuides fingerY={fingerY} />}
    </RemoteScreen>
  );
}
