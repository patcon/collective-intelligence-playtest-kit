import { Badge } from '@cloudflare/kumo';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react';
import { nextDetection } from '../lib/valence.ts';
import type { Detection } from '../lib/valence.ts';

interface DetectionBadgeProps {
  value: Detection;
  onChange: (detection: Detection) => void;
}

/** The detection as a small badge; each tap moves on to the next one. */
export function DetectionBadge({ value, onChange }: DetectionBadgeProps) {
  const next = nextDetection(value);
  return (
    <button aria-label={`Mode: ${value}. Tap for ${next}.`} onClick={() => onChange(next)} type="button">
      <Badge variant="neutral">
        <ArrowsClockwiseIcon aria-hidden className="mr-1" size={12} />
        {value}
      </Badge>
    </button>
  );
}
