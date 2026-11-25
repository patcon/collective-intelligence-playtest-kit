import { TOUCH_ENDS } from '../lib/valence.ts';
import { inkFor } from './ink.ts';

const ENDS = [
  { at: TOUCH_ENDS.high, label: '+1' },
  { at: TOUCH_ENDS.low, label: '−1' },
];

interface TouchGuidesProps {
  fingerY: number | null;
  showLabels: boolean;
  /** On the idle colour (see `valenceColor`). */
  idle?: boolean;
}

/** Touch mode's +1 and −1 marks, labelled if `showLabels`, and where the finger is while touching. */
export function TouchGuides({ fingerY, showLabels, idle = false }: TouchGuidesProps) {
  const ink = inkFor(idle);
  return (
    <div className={`pointer-events-none absolute inset-0 ${ink.shadow}`}>
      {ENDS.map(({ at, label }) => (
        <div className="absolute inset-x-6" key={label} style={{ top: `${at * 100}%` }}>
          <div className={`border-t-2 border-dashed ${ink.line}`} />
          {showLabels && <span className={`absolute right-0 bottom-1 font-mono text-lg ${ink.text}`}>{label}</span>}
        </div>
      ))}
      {fingerY !== null && (
        <div className={`absolute inset-x-0 border-t-4 ${ink.strongLine}`} style={{ top: `${fingerY * 100}%` }} />
      )}
    </div>
  );
}
