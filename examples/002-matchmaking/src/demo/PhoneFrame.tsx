import type { ReactNode } from 'react';

/**
 * A minimal phone around `children`: a bezel, a speaker slot, and a screen with phone-like
 * proportions that scrolls if its content is taller. For showing, on the demo page, something meant
 * to be held, such as the emcee's controls. `label` names the device for screen readers.
 */
export function PhoneFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure aria-label={label} className="mx-auto w-full max-w-92 rounded-[3rem] bg-kumo-recessed p-3 shadow-lg ring-1 ring-kumo-line">
      <div className="flex aspect-9/17 flex-col overflow-hidden rounded-[2.25rem] bg-kumo-base ring-1 ring-kumo-hairline">
        <div aria-hidden className="mx-auto mt-3 h-1.5 w-16 shrink-0 rounded-full bg-kumo-line" />
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </figure>
  );
}
