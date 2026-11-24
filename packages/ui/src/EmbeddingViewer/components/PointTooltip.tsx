import { lutColor, trackLut } from '../lib/palettes.ts';
import type { ViewerTrack } from '../types.ts';

/** Hover label for a point: its track's name, in the track's mid-gradient colour, over the point's label. */
export default function PointTooltip({
  x,
  y,
  text,
  track,
  tracks,
}: {
  /** Pointer position within the viewer, in px. */
  x: number;
  y: number;
  text: string;
  track: number;
  tracks: ReadonlyArray<ViewerTrack>;
}) {
  return (
    <div
      className="kumo-tooltip-popup absolute pointer-events-none z-10 max-w-[240px] whitespace-pre-wrap rounded-md bg-kumo-base px-2.5 py-1.5 text-sm text-kumo-default shadow-md outline outline-kumo-line"
      style={{ left: x + 12, top: y + 12 }}
    >
      <span
        className="font-semibold"
        style={{ color: `#${lutColor(trackLut(tracks[track], track), 0.5).getHexString()}` }}
      >
        {tracks[track]?.label}
      </span>
      {'\n'}
      {text}
    </div>
  );
}
