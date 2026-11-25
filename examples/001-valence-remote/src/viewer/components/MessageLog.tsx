/** The latest raw messages from the room, newest first, to show what's actually being sent. */
export function MessageLog({ entries }: { entries: Array<string> }) {
  return (
    <pre className="h-80 overflow-auto rounded-md bg-kumo-recessed p-3 font-mono text-xs" data-testid="message-log">
      {entries.length === 0 ? 'No messages yet.' : entries.join('\n')}
    </pre>
  );
}
