import { Link } from '@cloudflare/kumo';
import type { ReactNode } from 'react';
import { renderSVG } from 'uqr';

/** A QR code and link to the remote, for phones to join from, under any options for it (`children`). */
export function JoinQrCode({ url, children }: { url: string; children?: ReactNode }) {
  const src = `data:image/svg+xml;utf8,${encodeURIComponent(renderSVG(url))}`;

  return (
    <div className="flex w-56 flex-col items-center gap-2">
      {children}
      <img alt={`QR code for ${url}`} className="size-48 rounded-md bg-white p-2" src={src} />
      <Link className="text-sm break-all" href={url} target="_blank">
        {url}
      </Link>
    </div>
  );
}
