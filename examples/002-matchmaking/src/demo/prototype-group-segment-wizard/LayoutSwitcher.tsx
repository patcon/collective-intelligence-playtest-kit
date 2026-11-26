// PROTOTYPE (throwaway): a floating bar to flip `GroupSegmentWizard` between its layouts, kept in ?variant=
// (e.g. ?variant=modeTabs) so a layout survives a reload. No arrow keys: effects are restricted here. Dev only.
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { LAYOUTS } from './variants.tsx';
import type { GroupSegmentWizardLayout } from './variants.tsx';

const NAMES = Object.keys(LAYOUTS).filter((name): name is GroupSegmentWizardLayout => name in LAYOUTS);

function layoutFromUrl(): GroupSegmentWizardLayout {
  const asked = new URLSearchParams(window.location.search).get('variant');
  return NAMES.find((name) => name === asked) ?? 'compact';
}

/** Which layout is showing, from ?variant=, and a way to switch that keeps the URL in step. */
export function useLayoutChoice() {
  const [layout, setLayout] = useState(layoutFromUrl);
  const select = (next: GroupSegmentWizardLayout) => {
    setLayout(next);
    const url = new URL(window.location.href);
    url.searchParams.set('variant', next);
    window.history.replaceState(null, '', url);
  };
  return { layout, select };
}

export function LayoutSwitcher({ layout, onLayout }: { layout: GroupSegmentWizardLayout; onLayout: (layout: GroupSegmentWizardLayout) => void }) {
  const at = NAMES.indexOf(layout);
  const go = (delta: number) => onLayout(NAMES[(at + delta + NAMES.length) % NAMES.length] ?? 'compact');
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black px-2 py-1.5 text-sm text-white shadow-lg">
      <button aria-label="Previous layout" className="rounded-full p-1 hover:bg-white/20" onClick={() => go(-1)} type="button">
        <CaretLeftIcon />
      </button>
      <span>
        <code>{layout}</code> · {LAYOUTS[layout].name}
      </span>
      <button aria-label="Next layout" className="rounded-full p-1 hover:bg-white/20" onClick={() => go(1)} type="button">
        <CaretRightIcon />
      </button>
    </div>
  );
}
