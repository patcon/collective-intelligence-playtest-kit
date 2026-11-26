import { ArrowSquareOutIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

interface PhoneFrameProps {
  /** Names the device for screen readers. */
  label: string;
  /** The page the phone is showing. When given, it gets a URL bar that opens it in a new tab. */
  url?: string;
  children: ReactNode;
}

/** A phone browser's URL bar: the address without its scheme, opening the page itself in a new tab. */
function UrlBar({ url }: { url: string }) {
  return (
    <a
      className="mx-4 mt-2 flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-kumo-recessed px-3 py-1.5 text-sm text-kumo-subtle hover:text-kumo-default"
      href={url}
      rel="noreferrer"
      target="_blank"
    >
      <span className="truncate">{url.replace(/^https?:\/\//, '')}</span>
      <ArrowSquareOutIcon aria-hidden className="size-3.5 shrink-0" />
    </a>
  );
}

/**
 * A minimal phone around `children`: a bezel, a speaker slot, an optional URL bar, and a screen with
 * phone-like proportions that scrolls if its content is taller. For showing, on the demo page,
 * something meant to be held, such as the emcee's controls.
 */
export function PhoneFrame({ label, url, children }: PhoneFrameProps) {
  return (
    <figure aria-label={label} className="mx-auto w-full max-w-92 rounded-[3rem] bg-kumo-recessed p-3 shadow-lg ring-1 ring-kumo-line">
      <div className="flex aspect-9/17 flex-col overflow-hidden rounded-[2.25rem] bg-kumo-base ring-1 ring-kumo-hairline">
        <div aria-hidden className="mx-auto mt-3 h-1.5 w-16 shrink-0 rounded-full bg-kumo-line" />
        {url && <UrlBar url={url} />}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </figure>
  );
}
