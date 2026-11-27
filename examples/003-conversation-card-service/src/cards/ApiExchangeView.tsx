import { Badge } from '@cloudflare/kumo';
import type { ReactNode } from 'react';
import type { ApiExchange } from './cardsApi.ts';

/** The request and the formatted response of one call to the card service. */
export function ApiExchangeView({ exchange }: { exchange: ApiExchange }) {
  const ok = exchange.status >= 200 && exchange.status < 300;
  return (
    <section aria-label="API call" className="flex flex-col gap-2 rounded-md border border-kumo-fill bg-kumo-base p-3 text-sm">
      <Row label="Request">
        <code className="font-mono break-all">GET {exchange.request}</code>
      </Row>
      <Row label="Response">
        <Badge variant={ok ? 'success' : 'error'}>{exchange.status}</Badge>
      </Row>
      <pre className="max-h-80 overflow-auto rounded bg-kumo-elevated p-2 font-mono text-xs/5 wrap-break-word whitespace-pre-wrap">{exchange.response}</pre>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-20 shrink-0 text-kumo-subtle">{label}</span>
      {children}
    </div>
  );
}
