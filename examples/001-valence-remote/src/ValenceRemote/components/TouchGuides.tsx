import { TOUCH_ENDS } from '../lib/valence.ts';

const ENDS = [
  { at: TOUCH_ENDS.high, label: '+1' },
  { at: TOUCH_ENDS.low, label: '−1' },
];

/** Touch mode's +1 and −1 marks, labelled if `showLabels`, and where the finger is (or last was). */
export function TouchGuides({ fingerY, showLabels }: { fingerY: number | null; showLabels: boolean }) {
  return (
    <>
      {ENDS.map(({ at, label }) => (
        <div className="pointer-events-none absolute inset-x-6 mix-blend-difference" key={label} style={{ top: `${at * 100}%` }}>
          <div className="border-t-2 border-dashed border-white" />
          {showLabels && <span className="absolute right-0 bottom-1 font-mono text-lg">{label}</span>}
        </div>
      ))}
      {fingerY !== null && (
        <div
          className="pointer-events-none absolute inset-x-0 border-t-4 border-white mix-blend-difference"
          style={{ top: `${fingerY * 100}%` }}
        />
      )}
    </>
  );
}
