import { useId } from 'react';

interface FlipIllustrationProps {
  /** What the picture says, for screen readers. */
  label: string;
  /** Size and colour: it's drawn in `currentColor`, so a translucent colour tints what's behind. */
  className?: string;
}

// The mask's two paints: shape shows the colour, gap cuts it away.
const SHAPE = 'white';
const GAP = 'black';

const FOREARM =
  'M110 240 C108 214 104 196 94 184 C84 176 68 170 64 156 L62 138 L150 136 L158 160 C161 175 163 200 164 240 Z';
const PHONE =
  'M66 160 L134 160 Q139 160 138.6 155 L134.4 64 Q134 60 130 60 L70 60 Q66 60 65.6 64 L61.4 155 Q61 160 66 160 Z';
const THUMB =
  'M164 240 C163 200 162 170 158 140 C156 128 151 118 142 111 C136 107 127 104 122 107 C117 111 119 118 124 120 ' +
  'C130 123 135 128 136 136 C138 146 139 175 139 240 Z';

/** A finger as a capsule: its centre, length, thickness and angle. */
const FINGERS: Array<[number, number, number, number, number]> = [
  [60, 108, 30, 18, -12],
  [61, 126, 29, 17.5, -8],
  [63, 143, 24, 15, -4],
];

function Finger({ at: [cx, cy, length, thickness, angle] }: { at: [number, number, number, number, number] }) {
  return (
    <rect
      height={thickness}
      paintOrder="stroke"
      rx={thickness / 2}
      stroke={GAP}
      strokeWidth={7}
      transform={`rotate(${angle} ${cx} ${cy})`}
      width={length}
      x={cx - length / 2}
      y={cy - thickness / 2}
    />
  );
}

/**
 * A right hand holding a phone face up, with an arrow for the wrist rolling it face down: flip
 * mode's instruction. Drawn in one colour through a mask, so the gaps between its parts show what's behind.
 */
export function FlipIllustration({ label, className = '' }: FlipIllustrationProps) {
  const id = useId().replaceAll(/[^\w-]/g, '');
  const ids = { arrow: `${id}-arrow`, low: `${id}-low`, mask: `${id}-mask` };

  return (
    <svg aria-label={label} className={className} role="img" viewBox="0 0 200 200">
      <defs>
        <marker id={ids.arrow} markerHeight="2.4" markerWidth="2.4" orient="auto" refX="3" refY="5" viewBox="0 0 10 10">
          <path d="M0 0L10 5L0 10z" fill={SHAPE} />
        </marker>
        {/* Below the phone, where the palm hides the seam between thumb and forearm. */}
        <clipPath id={ids.low}>
          <rect height="90" width="200" y="166" />
        </clipPath>
        <mask id={ids.mask}>
          <rect fill={GAP} height="200" width="200" />
          <g fill={SHAPE} strokeLinejoin="round" transform="rotate(-8 100 130)">
            <path d={FOREARM} />
            {/* The index finger, behind the phone, pokes out past its edge. */}
            <Finger at={[58, 94, 50, 15, 28]} />
            <path d={PHONE} paintOrder="stroke" stroke={GAP} strokeWidth={8} />
            <path d="M72 146 L128 146 L125 73 L75 73 Z" fill={GAP} stroke={GAP} strokeWidth={2} />
            <line stroke={GAP} strokeLinecap="round" strokeWidth={4} x1="94" x2="106" y1="153" y2="153" />
            {FINGERS.map((finger) => (
              <Finger at={finger} key={finger.join()} />
            ))}
            <path d={THUMB} paintOrder="stroke" stroke={GAP} strokeWidth={7} />
            <path clipPath={`url(#${ids.low})`} d={FOREARM} />
          </g>
          <path
            d="M172 112 C190 54 146 18 98 20 C58 22 28 40 22 62"
            fill="none"
            markerEnd={`url(#${ids.arrow})`}
            stroke={SHAPE}
            strokeLinecap="round"
            strokeWidth={11}
          />
        </mask>
      </defs>
      <rect fill="currentColor" height="200" mask={`url(#${ids.mask})`} width="200" />
    </svg>
  );
}
