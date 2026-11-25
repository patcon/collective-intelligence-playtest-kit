import type { PointerEvent, ReactNode } from 'react';
import type { OrientationStatus } from '../hooks/effects/useDeviceOrientation.ts';
import type { BarPosition } from './components/ValenceBar.tsx';
import type { AxisLabels } from './lib/axisLabels.ts';
import { DetectionBadge } from './components/DetectionBadge.tsx';
import { FlipIllustration } from './components/FlipIllustration.tsx';
import { inkFor } from './components/ink.ts';
import { RemoteScreen } from './components/RemoteScreen.tsx';
import { StartScreen } from './components/StartScreen.tsx';
import { TouchGuides } from './components/TouchGuides.tsx';
import { useValenceRemote } from './hooks/useValenceRemote.ts';
import type { ValenceRemoteOptions } from './hooks/useValenceRemote.ts';
import { flipInstruction, INSTRUCTIONS, ORIENTATION_NOTES } from './lib/instructions.ts';
import type { Detection } from './lib/valence.ts';

export interface ValenceRemoteProps extends Partial<ValenceRemoteOptions> {
  /** Snapped to `levels`, sent only when it changes and at most every ~50 ms; null when it can't tell. */
  onValence: (valence: number | null) => void;
  /** Turn the screen the idle badge's yellow while idle, so it shows on the phone too. */
  tintWhenIdle?: boolean;
  /** Show the valence as a number, and touch mode's ends as +1 and −1. */
  showNumeric?: boolean;
  /** Which edge the valence bar runs along: `top` (default) or `left`. */
  barPosition?: BarPosition;
  /** Words beside the valence bar's ends (and middle), or none. */
  axisLabels?: AxisLabels | null;
  /** Badges for the running screen's top-left corner (e.g. the connection), or none. */
  badges?: ReactNode;
  /**
   * Called with the next detection when the holder taps the mode badge, top right of the running
   * screen. Without it there's no badge. The new detection takes effect once passed back in.
   */
  onPickDetection?: (detection: Detection) => void;
}

const START_WARNINGS: Partial<Record<OrientationStatus, string>> = {
  insecure: 'Tilt needs a secure (https) page, and this one isn’t.',
  unsupported: 'This browser can’t read tilt.',
};

function notesFor(touch: boolean, status: OrientationStatus, wakeLockLost: boolean): Array<string> {
  const orientationNote = touch ? null : ORIENTATION_NOTES[status];
  return [orientationNote, wakeLockLost ? 'The screen may sleep.' : null].filter((note) => note !== null);
}

/**
 * The start screen's warning, or null to show the start screen without one, or undefined once running.
 * It also comes back when switched to tilt (by a prop) before motion access was asked for.
 */
function startScreenWarning(started: boolean, touch: boolean, status: OrientationStatus): string | null | undefined {
  if (touch) {
    return started ? undefined : null;
  }
  if (started && status !== 'needs-permission') {
    return undefined;
  }
  return START_WARNINGS[status] ?? null;
}

/**
 * Turns a phone into a remote: its orientation (or a finger's height) as a valence from −1 to +1.
 * The screens for `useValenceRemote`, which does the reading without them.
 */
export function ValenceRemote({
  tintWhenIdle = false,
  showNumeric = false,
  barPosition,
  axisLabels,
  detection = 'flip',
  badges,
  onPickDetection,
  ...options
}: ValenceRemoteProps) {
  const remote = useValenceRemote({ ...options, detection });
  const touch = detection === 'touch';

  const pick = (next: Detection) => {
    remote.prepare(next);
    onPickDetection?.(next);
  };

  const onPointer = (y: number, event: PointerEvent<HTMLDivElement>) => {
    if (event.type === 'pointerdown' || event.buttons > 0) {
      remote.touch.press(y);
    }
  };

  const idle = tintWhenIdle && remote.activity === 'idle';
  const warning = startScreenWarning(remote.started, touch, remote.tilt.status);
  const illustrate = (className: string) =>
    detection === 'flip' ? <FlipIllustration className={className} label={flipInstruction(axisLabels)} /> : undefined;
  if (warning !== undefined) {
    return (
      <StartScreen
        illustration={illustrate('size-32 text-kumo-subtle')}
        instruction={INSTRUCTIONS[detection]}
        onStart={remote.start}
        warning={warning}
      />
    );
  }

  return (
    <RemoteScreen
      badges={badges}
      axisLabels={axisLabels}
      barPosition={barPosition}
      controls={onPickDetection && <DetectionBadge onChange={pick} value={detection} />}
      idle={idle}
      illustration={illustrate(`size-40 ${inkFor(idle).picture}`)}
      instruction={INSTRUCTIONS[detection]}
      snapped={remote.snapped}
      notes={notesFor(touch, remote.tilt.status, remote.wakeLockLost)}
      onPointer={touch ? onPointer : undefined}
      onRelease={touch ? remote.touch.release : undefined}
      showNumeric={showNumeric}
      valence={remote.valence}
    >
      {touch && <TouchGuides fingerY={remote.touch.y} idle={idle} showLabels={showNumeric} />}
    </RemoteScreen>
  );
}
