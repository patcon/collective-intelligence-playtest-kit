import type { Card } from '../../worker/cards/types.ts';
import { Glyph } from './Glyph.tsx';
import './printedCard.css';

/** A card as it's printed: paper, a double-line frame, the glyph in a badge on the frame, and the text. */
export function PrintedCard({ card }: { card: Card }) {
  return (
    <article aria-label={`Card ${card.id}`} className="printed-card">
      <div className="printed-card__badge" title={card.type}>
        <Glyph className="printed-card__glyph" type={card.type} />
      </div>
      <p className="printed-card__text">{card.text}</p>
      <span className="printed-card__meta">
        #{card.id} · {card.type}
      </span>
    </article>
  );
}
