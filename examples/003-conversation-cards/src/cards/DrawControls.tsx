import { Button, Input, Select } from '@cloudflare/kumo';
import { ShuffleIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import type { CardFilters } from '../../worker/cards/types.ts';

const ALL_TYPES = 'all';

/** Choose a card type, a short list of ids and how many to draw; then draw. */
export function DrawControls({
  types,
  pending,
  onDraw,
}: {
  types: ReadonlyArray<string>;
  pending: boolean;
  onDraw: (filters: CardFilters, limit: number) => void;
}) {
  const [type, setType] = useState(ALL_TYPES);
  const [ids, setIds] = useState('');
  const [limit, setLimit] = useState(1);
  const items = [{ label: 'All card types', value: ALL_TYPES }, ...types.map((value) => ({ label: value, value }))];
  const chosenIds = ids.split(',').map((id) => id.trim()).filter(Boolean);

  const draw = () =>
    onDraw({ type: type === ALL_TYPES ? undefined : type, ids: chosenIds.length > 0 ? chosenIds : undefined }, limit);

  return (
    <div className="flex flex-col gap-3">
      <Select className="w-full" items={items} label="Card type" onValueChange={(value) => setType(value ?? ALL_TYPES)} value={type} />
      <Input
        description="Comma-separated, e.g. 2, 15, 40. Leave empty for the whole deck."
        label="Only these card ids"
        onChange={(event) => setIds(event.target.value)}
        value={ids}
      />
      <Input
        label="How many to draw"
        min={1}
        onChange={(event) => setLimit(Math.max(1, Math.floor(Number(event.target.value)) || 1))}
        type="number"
        value={limit}
      />
      <Button icon={<ShuffleIcon />} loading={pending} onClick={draw} variant="primary">
        Draw
      </Button>
    </div>
  );
}
