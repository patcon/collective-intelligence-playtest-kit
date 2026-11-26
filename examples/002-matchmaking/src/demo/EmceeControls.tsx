import { Button } from '@cloudflare/kumo';
import { CaretLeftIcon } from '@phosphor-icons/react';
import type { Phase } from '../room/roomViews.ts';

/** What the emcee can tell the room to do. */
export type RoundCommand = { type: 'start' | 'moveOn' | 'back' | 'reshuffle' };

interface EmceeControlsProps {
  phase: Phase;
  /** Why a new match (a start or a reshuffle) would be refused, or null. See `startBlocker`. */
  blocker: string | null;
  onCommand: (command: RoundCommand) => void;
}

/** Forward from each phase, and what back does from it (for screen readers; the button is an arrow). */
const STEPS: Record<Phase, { forward: RoundCommand; label: string; back: string }> = {
  activity: { back: 'Back to the round', forward: { type: 'moveOn' }, label: 'End activity' },
  lobby: { back: 'Back', forward: { type: 'start' }, label: 'Start matchmaking' },
  round: { back: 'Back to the lobby', forward: { type: 'moveOn' }, label: 'Start activity' },
};

/**
 * Back and forward through the phases. Back is disabled in the lobby; Start says why when it's
 * disabled. Reset sits apart, in the pane's header (see `ResetButton`).
 */
export function EmceeControls({ phase, blocker, onCommand }: EmceeControlsProps) {
  const step = STEPS[phase];
  const inLobby = phase === 'lobby';
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button
          aria-label={step.back}
          disabled={inLobby}
          icon={CaretLeftIcon}
          onClick={() => onCommand({ type: 'back' })}
          shape="square"
          size="lg"
          variant="secondary"
        />
        <Button className="flex-1" disabled={inLobby && blocker !== null} onClick={() => onCommand(step.forward)} size="lg" variant="primary">
          {step.label}
        </Button>
      </div>
      {inLobby && blocker && <p className="text-sm text-kumo-subtle">{blocker}</p>}
    </div>
  );
}

/**
 * A small red Reset: throws this round's groups away and matches everyone ready again (the room's
 * `reshuffle`). Disabled until there are groups, or when a new match would be refused.
 */
export function ResetButton({ phase, blocker, onCommand }: EmceeControlsProps) {
  return (
    <Button disabled={phase === 'lobby' || blocker !== null} onClick={() => onCommand({ type: 'reshuffle' })} size="xs" variant="destructive">
      Reset
    </Button>
  );
}
