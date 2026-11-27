import { Button, Slider, Surface, Tabs } from '@cloudflare/kumo';
import { useOnChange } from '@playtest-kit/common';
import { useState } from 'react';
import type { QuizConfig, RoomSnapshot } from '../room/protocol.ts';
import { MAX_STATEMENTS } from '../room/quizConfig.ts';
import { progressLine, startBlocker } from './quizProgress.ts';

interface QuizControlsProps {
  snapshot: RoomSnapshot;
  onConfig: (config: QuizConfig) => void;
  onStart: () => void;
  onReset: () => void;
}

/**
 * The quiz's settings, where the room is, and Start and Reset. Shows the room's config and sends any change
 * straight back; the statement count applies at the next Start.
 */
export function QuizControls({ snapshot, onConfig, onStart, onReset }: QuizControlsProps) {
  const { config } = snapshot;
  const blocker = startBlocker(snapshot);
  // While the slider moves, it shows where it is, not the room's echo of an earlier step; it lets go once the room agrees.
  const [draft, setDraft] = useState<number | null>(null);
  useOnChange(config.statementCount, (count) => count === draft && setDraft(null));
  const statementCount = draft ?? config.statementCount;
  return (
    <Surface className="flex flex-col gap-4 rounded-lg p-5">
      <h2 className="text-lg font-semibold">Quiz</h2>
      <Slider
        label={`Statements: ${statementCount} of ${MAX_STATEMENTS}`}
        max={MAX_STATEMENTS}
        min={1}
        onValueChange={(value) => {
          if (typeof value === 'number') {
            setDraft(value);
            onConfig({ ...config, statementCount: value });
          }
        }}
        value={statementCount}
      />
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Latecomers</span>
        <Tabs
          onValueChange={(value) => (value === 'wait' || value === 'join') && onConfig({ ...config, latecomers: value })}
          tabs={[
            { label: 'Wait for the next quiz', value: 'wait' },
            { label: 'Join at statement 1', value: 'join' },
          ]}
          value={config.latecomers}
        />
      </div>
      <p className="text-sm tabular-nums text-kumo-subtle">{progressLine(snapshot)}</p>
      <div className="flex gap-2">
        <Button className="flex-1" disabled={blocker !== null} onClick={onStart} variant="primary">
          Start
        </Button>
        <Button onClick={onReset} variant="secondary">
          Reset
        </Button>
      </div>
      {/* Its line is kept even when empty, so the panel doesn't jump as people get ready. */}
      <p className="min-h-5 text-sm text-kumo-subtle">{snapshot.phase === 'lobby' ? blocker : null}</p>
    </Surface>
  );
}
