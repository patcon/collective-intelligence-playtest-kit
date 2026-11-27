import type { Card } from '../../worker/cards/types.ts';
import { PlainCard } from './PlainCard.tsx';
import { PrintedCard } from './PrintedCard.tsx';

/** A card in the printed look or as plain UI. */
export function CardView({ card, printed }: { card: Card; printed: boolean }) {
  return printed ? <PrintedCard card={card} /> : <PlainCard card={card} />;
}
