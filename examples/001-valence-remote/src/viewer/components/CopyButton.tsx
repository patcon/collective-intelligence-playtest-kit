import { Button } from '@cloudflare/kumo';
import { CheckIcon, CopyIcon } from '@phosphor-icons/react';
import { useState } from 'react';

const COPIED_MS = 1500;

/** Copies `text` to the clipboard, showing a tick for a moment once it has. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_MS);
  };

  return (
    <Button icon={copied ? CheckIcon : CopyIcon} onClick={() => void copy()} size="sm" variant="secondary">
      {copied ? 'Copied' : label}
    </Button>
  );
}
