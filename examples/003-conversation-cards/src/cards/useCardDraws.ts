import { useState } from 'react';
import type { Card, CardFilters, CardsResponse } from '../../worker/cards/types.ts';
import { messageOf, requestDraw } from './cardsApi.ts';

/** Draws from the card service, remembering every card seen so later draws exclude it. */
export function useCardDraws() {
  const [seen, setSeen] = useState<ReadonlyArray<string>>([]);
  const [drawn, setDrawn] = useState<ReadonlyArray<Card>>([]);
  const [meta, setMeta] = useState<CardsResponse['meta'] | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const draw = async (filters: CardFilters, limit: number) => {
    setPending(true);
    try {
      const result = await requestDraw({ ...filters, exclude: seen }, limit);
      setDrawn(result.cards);
      setMeta(result.meta);
      setSeen([...seen, ...result.cards.map((card) => card.id)]);
      setFailure(null);
    } catch (error) {
      setFailure(messageOf(error));
    } finally {
      setPending(false);
    }
  };

  const reset = () => {
    setSeen([]);
    setDrawn([]);
    setMeta(null);
    setFailure(null);
  };

  return { draw, drawn, failure, meta, pending, reset, seen };
}
