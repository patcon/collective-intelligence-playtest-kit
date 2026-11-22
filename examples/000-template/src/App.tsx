import { Button, Surface } from '@cloudflare/kumo';
import { PlusIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import useDocumentTitle from './hooks/effects/useDocumentTitle.ts';

export default function App() {
  const [count, setCount] = useState(0);
  useDocumentTitle(`Count: ${count}`);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center p-4">
      <Surface className="flex w-full flex-col gap-4 rounded-lg p-6">
        <h1 className="text-xl font-semibold">000-template</h1>
        <p>Clicked {count} times.</p>
        <Button icon={<PlusIcon />} onClick={() => setCount((n) => n + 1)} variant="primary">
          Increment
        </Button>
      </Surface>
    </main>
  );
}
