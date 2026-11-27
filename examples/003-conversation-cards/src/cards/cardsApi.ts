import type { Card, CardFilters, CardsResponse } from '../../worker/cards/types.ts';

const BASE = '/api/cards';

/** One request to the card service and what came back, as the page shows it when "Show API calls" is on. */
export interface ApiExchange {
  /** The route, e.g. `GET /api/cards/random`. */
  readonly endpoint: string;
  /** The URL requested, with its query. */
  readonly request: string;
  readonly status: number;
  /** The response body, pretty-printed when it's JSON. */
  readonly response: string;
}

/** A parsed result, with the exchange that produced it. */
export interface Exchanged<T> {
  readonly data: T;
  readonly exchange: ApiExchange;
}

/** A failed request, carrying its exchange so the page can still show it. */
export class ApiError extends Error {
  readonly exchange: ApiExchange;

  constructor(message: string, exchange: ApiExchange) {
    super(message);
    this.exchange = exchange;
  }
}

/** Every card the filters allow, in deck order. */
export async function requestCards(filters: CardFilters = {}): Promise<Exchanged<CardsResponse>> {
  const { body, exchange } = await send(`GET ${BASE}`, `${BASE}${queryOf(filters)}`);
  return { data: parseCardsResponse(body, exchange), exchange };
}

/** Up to `limit` cards drawn at random from the pool the filters allow. */
export async function requestDraw(filters: CardFilters, limit: number): Promise<Exchanged<CardsResponse>> {
  const { body, exchange } = await send(`GET ${BASE}/random`, `${BASE}/random${queryOf(filters, limit)}`);
  return { data: parseCardsResponse(body, exchange), exchange };
}

/** The card with `id`, or `null` if the deck has none. */
export async function requestCard(id: string): Promise<Exchanged<Card | null>> {
  const { body, exchange } = await send(`GET ${BASE}/:cardId`, `${BASE}/${encodeURIComponent(id)}`, [404]);
  if (exchange.status === 404) {
    return { data: null, exchange };
  }
  if (typeof body === 'object' && body !== null && 'card' in body && isCard(body.card)) {
    return { data: body.card, exchange };
  }
  throw new ApiError(`Expected { card }, got ${exchange.response}`, exchange);
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The exchange a failed request carried, if it got as far as a response. */
export function exchangeOf(error: unknown): ApiExchange | null {
  return error instanceof ApiError ? error.exchange : null;
}

/** Builds the query, leaving commas in id lists readable (`ids=2,15`); the service accepts either form. */
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
  const query = params.toString().replaceAll('%2C', ',');
  return query ? `?${query}` : '';
}

/** GETs `url` and reads its JSON body; throws an `ApiError` unless the status is OK or one of `expected`. */
async function send(
  endpoint: string,
  url: string,
  expected: ReadonlyArray<number> = [],
): Promise<{ body: unknown; exchange: ApiExchange }> {
  const response = await fetch(url);
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    // Not JSON: the exchange shows the raw text instead.
    body = undefined;
  }
  const exchange: ApiExchange = {
    endpoint,
    request: url,
    status: response.status,
    response: body === undefined ? text : JSON.stringify(body, null, 2),
  };
  if (!response.ok && !expected.includes(response.status)) {
    const reason =
      typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
        ? body.error
        : response.statusText;
    throw new ApiError(`${url} answered ${response.status}: ${reason}`, exchange);
  }
  return { body, exchange };
}

function parseCardsResponse(body: unknown, exchange: ApiExchange): CardsResponse {
  if (typeof body === 'object' && body !== null && 'cards' in body && 'meta' in body) {
    const { cards, meta } = body;
    if (Array.isArray(cards) && cards.every(isCard) && isMeta(meta)) {
      return { cards, meta };
    }
  }
  throw new ApiError(`Expected { cards, meta: { pool, total } }, got ${exchange.response}`, exchange);
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
