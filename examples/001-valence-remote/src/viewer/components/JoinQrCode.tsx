import { Link } from '@cloudflare/kumo';
import { renderSVG } from 'uqr';

/** A QR code and link to the remote, for phones to join from. */
export function JoinQrCode({ url }: { url: string }) {
  const src = `data:image/svg+xml;utf8,${encodeURIComponent(renderSVG(url))}`;

  return (
    <div className="flex flex-col items-center gap-2">
      <img alt={`QR code for ${url}`} className="size-48 rounded-md bg-white p-2" src={src} />
      <Link className="text-sm break-all" href={url} target="_blank">
        {url}
      </Link>
    </div>
  );
}
