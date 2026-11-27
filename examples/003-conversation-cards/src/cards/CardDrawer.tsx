import { Banner, Button, Empty } from '@cloudflare/kumo';
import { ArrowCounterClockwiseIcon, CardsIcon } from '@phosphor-icons/react';
import { use } from 'react';
import type { CardsResponse } from '../../worker/cards/types.ts';
import { CardView } from './CardView.tsx';
import { DrawControls } from './DrawControls.tsx';
import { SeenCount } from './SeenCount.tsx';
import { useCardDraws } from './useCardDraws.ts';

/** Draw controls and the cards drawn, excluding seen cards. Suspends until `deck` (every card) loads. */
export function CardDrawer({ deck, printed }: { deck: Promise<CardsResponse>; printed: boolean }) {
  const { cards, meta } = use(deck);
  const types = [...new Set(cards.map((card) => card.type))].toSorted();
  const { draw, drawn, failure, meta: drawMeta, pending, reset, seen } = useCardDraws();

  return (
    <div className="flex flex-col gap-4">
      <DrawControls onDraw={(filters, limit) => void draw(filters, limit)} pending={pending} types={types} />
      <div className="flex items-center gap-3 text-sm text-kumo-subtle">
        <span>
          {drawMeta ? `Drawn from a pool of ${drawMeta.pool} of ${drawMeta.total}` : `${meta.total} cards in the deck`} ·{' '}
          <SeenCount seen={seen} />
        </span>
        <Button className="ml-auto" disabled={seen.length === 0} icon={<ArrowCounterClockwiseIcon />} onClick={reset} size="sm">
          Reset seen
        </Button>
      </div>
      {failure && <Banner description={failure} variant="alert" />}
      {drawMeta && drawn.length === 0 && (
        <Empty description="Every card these filters allow has been seen. Change the filters or reset." icon={<CardsIcon />} title="No cards left" />
      )}
      <div className="flex flex-wrap justify-center gap-4">
        {drawn.map((card) => (
          <CardView card={card} key={card.id} printed={printed} />
        ))}
      </div>
    </div>
  );
}
