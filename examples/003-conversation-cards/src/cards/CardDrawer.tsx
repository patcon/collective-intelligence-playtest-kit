import { Banner, Button, Empty } from '@cloudflare/kumo';
import { ArrowCounterClockwiseIcon, CardsIcon } from '@phosphor-icons/react';
import { use } from 'react';
import type { ReactNode } from 'react';
import type { CardsResponse } from '../../worker/cards/types.ts';
import { ApiExchangeView } from './ApiExchangeView.tsx';
import type { Exchanged } from './cardsApi.ts';
import { CardView } from './CardView.tsx';
import { DrawControls } from './DrawControls.tsx';
import { SeenCount } from './SeenCount.tsx';
import { useCardDraws } from './useCardDraws.ts';
import type { ViewOptions } from './viewOptions.ts';

/**
 * Draw controls and the cards drawn, excluding seen cards. Suspends until `deck` (every card) loads.
 * `beside` sits next to the Draw button. With `view.showApi`, shows the last call: the deck load until the first draw.
 */
export function CardDrawer({
  deck,
  view,
  beside,
}: {
  deck: Promise<Exchanged<CardsResponse>>;
  view: ViewOptions;
  beside?: ReactNode;
}) {
  const { data, exchange: deckExchange } = use(deck);
  const types = [...new Set(data.cards.map((card) => card.type))].toSorted();
  const { draw, drawn, exchange, failure, meta, pending, reset, seen } = useCardDraws();
  const shownExchange = exchange ?? deckExchange;

  return (
    <div className="flex flex-col gap-4">
      <DrawControls onDraw={(filters, limit) => void draw(filters, limit)} pending={pending} types={types}>
        {beside}
      </DrawControls>
      <div className="flex items-center gap-3 text-sm text-kumo-subtle">
        <span>
          {meta ? `Drawn from a pool of ${meta.pool} of ${meta.total}` : `${data.meta.total} cards in the deck`} ·{' '}
          <SeenCount seen={seen} />
        </span>
        <Button className="ml-auto" disabled={seen.length === 0} icon={<ArrowCounterClockwiseIcon />} onClick={reset} size="sm">
          Reset seen
        </Button>
      </div>
      {view.showApi && <ApiExchangeView exchange={shownExchange} />}
      {failure && <Banner description={failure} variant="alert" />}
      {meta && drawn.length === 0 && (
        <Empty description="Every card these filters allow has been seen. Change the filters or reset." icon={<CardsIcon />} title="No cards left" />
      )}
      <div className="flex flex-wrap justify-center gap-4">
        {drawn.map((card) => (
          <CardView card={card} key={card.id} printed={view.printed} />
        ))}
      </div>
    </div>
  );
}
