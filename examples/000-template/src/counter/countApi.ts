/** What loading the count came to: the count, or why it couldn't be read. */
export type CountResult = { count: number } | { error: string };

/** Reads the `{ count }` body the Worker answers `/api/count` with; throws on anything else. */
export function parseCount(body: unknown): number {
  if (typeof body === 'object' && body !== null && 'count' in body) {
    const { count } = body;
    if (typeof count === 'number' && Number.isInteger(count) && count >= 0) {
      return count;
    }
  }
  throw new Error(`Expected { count: <whole number> }, got ${JSON.stringify(body)}`);
}

async function requestCount(method: 'GET' | 'POST'): Promise<number> {
  const response = await fetch('/api/count', { method });
  if (!response.ok) {
    throw new Error(`/api/count answered ${response.status}`);
  }
  return parseCount(await response.json());
}

/** The shared count, or the error that stopped it loading. Never rejects. */
export async function loadCount(): Promise<CountResult> {
  try {
    return { count: await requestCount('GET') };
  } catch (error) {
    return { error: messageOf(error) };
  }
}

/** Adds one to the shared count and resolves to the new count. */
export function incrementCount(): Promise<number> {
  return requestCount('POST');
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
