import { Surface } from '@cloudflare/kumo';
import type { Card } from '../../worker/cards/types.ts';
import { Glyph } from './Glyph.tsx';

/** A card as plain UI: its glyph and card type, its text, and its id. */
export function PlainCard({ card }: { card: Card }) {
  return (
    <Surface className="flex w-full flex-col gap-2 rounded-lg p-4">
      <div className="flex items-center gap-2 text-sm text-kumo-subtle">
        <Glyph className="size-5 text-kumo-default" type={card.type} />
        <span>{card.type}</span>
        <span className="ml-auto">#{card.id}</span>
      </div>
      <p className="text-lg">{card.text}</p>
    </Surface>
  );
}
