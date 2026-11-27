import { Tabs } from '@cloudflare/kumo';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { ApiExchangeView } from './ApiExchangeView.tsx';
import type { ApiExchange } from './cardsApi.ts';

type Shown = 'rendered' | 'api';

/** A result two ways: rendered for people (`label`, e.g. "Cards"), or as the API call that produced it. */
export function ResultTabs({ label, exchange, children }: { label: string; exchange: ApiExchange; children: ReactNode }) {
  const [shown, setShown] = useState<Shown>('rendered');
  return (
    <div className="flex flex-col gap-3">
      <Tabs
        onValueChange={(value) => (value === 'rendered' || value === 'api') && setShown(value)}
        tabs={[
          { label, value: 'rendered' },
          { label: 'API call', value: 'api' },
        ]}
        value={shown}
      />
      {shown === 'rendered' ? children : <ApiExchangeView exchange={exchange} />}
    </div>
  );
}
