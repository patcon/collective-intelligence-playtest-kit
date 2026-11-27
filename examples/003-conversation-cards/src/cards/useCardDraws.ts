import { useState } from 'react';
import type { Card, CardFilters, CardsResponse } from '../../worker/cards/types.ts';
import { exchangeOf, messageOf, requestDraw } from './cardsApi.ts';
import type { ApiExchange } from './cardsApi.ts';

/** Draws from the card service, remembering every card seen so later draws exclude it. */
export function useCardDraws() {
  const [seen, setSeen] = useState<ReadonlyArray<string>>([]);
  const [drawn, setDrawn] = useState<ReadonlyArray<Card>>([]);
  const [meta, setMeta] = useState<CardsResponse['meta'] | null>(null);
  const [exchange, setExchange] = useState<ApiExchange | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const draw = async (filters: CardFilters, limit: number) => {
    setPending(true);
    try {
      const { data, exchange: made } = await requestDraw({ ...filters, exclude: seen }, limit);
      setDrawn(data.cards);
      setMeta(data.meta);
      setSeen([...seen, ...data.cards.map((card) => card.id)]);
      setExchange(made);
      setFailure(null);
    } catch (error) {
      setFailure(messageOf(error));
      setExchange(exchangeOf(error));
    } finally {
      setPending(false);
    }
  };

  const reset = () => {
    setSeen([]);
    setDrawn([]);
    setMeta(null);
    setExchange(null);
    setFailure(null);
  };

  return { draw, drawn, exchange, failure, meta, pending, reset, seen };
}
