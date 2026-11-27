import { Banner, Button, Input } from '@cloudflare/kumo';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import type { Card } from '../../worker/cards/types.ts';
import { fetchCard, messageOf } from './cardsApi.ts';
import { CardView } from './CardView.tsx';

type Lookup = { card: Card } | { missing: string } | { error: string } | null;

/** Shows one card by id: what each phone does when a server picks a card for everyone and sends its id. */
export function CardLookup({ printed }: { printed: boolean }) {
  const [id, setId] = useState('');
  const [lookup, setLookup] = useState<Lookup>(null);
  const [pending, setPending] = useState(false);

  const show = async () => {
    setPending(true);
    try {
      const card = await fetchCard(id.trim());
      setLookup(card ? { card } : { missing: id.trim() });
    } catch (error) {
      setLookup({ error: messageOf(error) });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void show();
        }}
      >
        <Input className="w-28" label="Show card #" onChange={(event) => setId(event.target.value)} value={id} />
        <Button disabled={!id.trim()} icon={<MagnifyingGlassIcon />} loading={pending} type="submit">
          Show
        </Button>
      </form>
      {lookup && 'card' in lookup && <CardView card={lookup.card} printed={printed} />}
      {lookup && 'missing' in lookup && <Banner description={`There's no card #${lookup.missing}.`} variant="secondary" />}
      {lookup && 'error' in lookup && <Banner description={lookup.error} variant="alert" />}
    </div>
  );
}
