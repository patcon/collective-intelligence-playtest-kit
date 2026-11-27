import type { CardFilters } from './types.ts';

/** Reads `type`, and the comma-separated `ids` and `exclude`, from a card route's query string. */
export function parseFilters(params: URLSearchParams): CardFilters {
  return {
    type: params.get('type') ?? undefined,
    ids: listParam(params, 'ids'),
    exclude: listParam(params, 'exclude'),
  };
}

/** Reads a draw's `limit`: 1 when absent, `null` when it isn't a positive whole number. */
export function parseLimit(params: URLSearchParams): number | null {
  const value = params.get('limit');
  if (value === null) {
    return 1;
  }
  return /^[1-9]\d*$/.test(value) ? Number(value) : null;
}

function listParam(params: URLSearchParams, name: string): Array<string> | undefined {
  const value = params.get(name);
  return value === null ? undefined : value.split(',').map((id) => id.trim()).filter(Boolean);
}
