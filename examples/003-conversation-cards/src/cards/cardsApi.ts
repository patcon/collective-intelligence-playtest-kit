import type { Card, CardFilters, CardsResponse } from '../../worker/cards/types.ts';

const BASE = '/api/cards';

/** Every card the filters allow, in deck order. */
export async function requestCards(filters: CardFilters = {}): Promise<CardsResponse> {
  return parseCardsResponse(await getJson(`${BASE}${queryOf(filters)}`));
}

/** Up to `limit` cards drawn at random from the pool the filters allow. */
export async function requestDraw(filters: CardFilters, limit: number): Promise<CardsResponse> {
  return parseCardsResponse(await getJson(`${BASE}/random${queryOf(filters, limit)}`));
}

/** The card with `id`, or `null` if the deck has none. */
export async function requestCard(id: string): Promise<Card | null> {
  const response = await fetch(`${BASE}/${encodeURIComponent(id)}`);
  if (response.status === 404) {
    return null;
  }
  const body = await jsonOf(response);
  if (body && 'card' in body && isCard(body.card)) {
    return body.card;
  }
  throw new Error(`Expected { card }, got ${JSON.stringify(body)}`);
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function queryOf({ type, ids, exclude }: CardFilters, limit?: number): string {
  const params = new URLSearchParams();
  if (type) {
    params.set('type', type);
  }
  if (ids) {
    params.set('ids', ids.join(','));
  }
  if (exclude && exclude.length > 0) {
    params.set('exclude', exclude.join(','));
  }
  if (limit !== undefined) {
    params.set('limit', String(limit));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

async function getJson(url: string): Promise<object | null> {
  return jsonOf(await fetch(url));
}

/** The response's JSON object (or `null` if it isn't one); throws with the service's `error` if the request failed. */
async function jsonOf(response: Response): Promise<object | null> {
  const value: unknown = await response.json().catch(() => null);
  const body = typeof value === 'object' && value !== null && !Array.isArray(value) ? value : null;
  if (!response.ok) {
    const reason = body && 'error' in body && typeof body.error === 'string' ? body.error : response.statusText;
    throw new Error(`${response.url} answered ${response.status}: ${reason}`);
  }
  return body;
}

function parseCardsResponse(body: unknown): CardsResponse {
  if (typeof body === 'object' && body !== null && 'cards' in body && 'meta' in body) {
    const { cards, meta } = body;
    if (Array.isArray(cards) && cards.every(isCard) && isMeta(meta)) {
      return { cards, meta };
    }
  }
  throw new Error(`Expected { cards, meta: { pool, total } }, got ${JSON.stringify(body)}`);
}

function isMeta(value: unknown): value is CardsResponse['meta'] {
  return (
    typeof value === 'object' &&
    value !== null &&
    'pool' in value &&
    typeof value.pool === 'number' &&
    'total' in value &&
    typeof value.total === 'number'
  );
}

function isCard(value: unknown): value is Card {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'text' in value &&
    typeof value.text === 'string' &&
    'type' in value &&
    typeof value.type === 'string'
  );
}
