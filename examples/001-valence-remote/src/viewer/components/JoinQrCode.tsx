import { Link, Select } from '@cloudflare/kumo';
import { renderSVG } from 'uqr';
import { isDetection } from '../../ValenceRemote/lib/valence.ts';
import type { Detection } from '../../ValenceRemote/lib/valence.ts';

const DETECTION_LABELS: Record<Detection, string> = {
  flip: 'Flip (face up / down)',
  invert: 'Invert (upright / upside down)',
  spin: 'Spin (steering wheel)',
  touch: 'Touch (finger height)',
};

interface JoinQrCodeProps {
  url: string;
  detection: Detection;
  onDetectionChange: (detection: Detection) => void;
}

/** A QR code and link to the remote, for phones to join from, with a picker for how they'll read. */
export function JoinQrCode({ url, detection, onDetectionChange }: JoinQrCodeProps) {
  const src = `data:image/svg+xml;utf8,${encodeURIComponent(renderSVG(url))}`;

  return (
    <div className="flex w-56 flex-col items-center gap-2">
      <Select
        className="w-full"
        items={DETECTION_LABELS}
        label="Detection"
        onValueChange={(value) => isDetection(value) && onDetectionChange(value)}
        value={detection}
      />
      <img alt={`QR code for ${url}`} className="size-48 rounded-md bg-white p-2" src={src} />
      <Link className="text-sm break-all" href={url} target="_blank">
        {url}
      </Link>
    </div>
  );
}
