import { TOUCH_ENDS } from '../lib/valence.ts';

/** Touch mode's +1 and −1 marks, and where the finger is (or last was). */
export function TouchGuides({ fingerY }: { fingerY: number | null }) {
  return (
    <>
      {[TOUCH_ENDS.high, TOUCH_ENDS.low].map((at) => (
        <div
          className="pointer-events-none absolute inset-x-6 border-t-2 border-dashed border-white mix-blend-difference"
          key={at}
          style={{ top: `${at * 100}%` }}
        />
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
