import { Banner, Button } from '@cloudflare/kumo';
import { PlusIcon } from '@phosphor-icons/react';
import { use, useState } from 'react';
import useDocumentTitle from '../hooks/effects/useDocumentTitle.ts';
import { incrementCount, messageOf } from './countApi.ts';
import type { CountResult } from './countApi.ts';

/** A count shared by everyone, held by the Worker's `Counter` Durable Object. Suspends until `initial` settles. */
export function SharedCounter({ initial }: { initial: Promise<CountResult> }) {
  const loaded = use(initial);
  const [count, setCount] = useState('count' in loaded ? loaded.count : null);
  const [failure, setFailure] = useState('error' in loaded ? loaded.error : null);
  const [pending, setPending] = useState(false);
  useDocumentTitle(count === null ? '000-template' : `Count: ${count}`);

  const increment = async () => {
    setPending(true);
    try {
      setCount(await incrementCount());
      setFailure(null);
    } catch (error) {
      setFailure(messageOf(error));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      {failure && <Banner description={failure} variant="alert" />}
      <p>{count === null ? 'Count unavailable.' : `Clicked ${count} times, by everyone.`}</p>
      <Button icon={<PlusIcon />} loading={pending} onClick={() => void increment()} variant="primary">
        Increment
      </Button>
    </>
  );
}
