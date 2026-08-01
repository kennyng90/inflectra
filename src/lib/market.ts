/* What every Instrument costs right now and how it has moved, plus the shape of
   its last week - the whole Market screen, from one request.

   One request is the point. Measured against the free tier, nine `/ohlc` calls
   paced ten seconds apart still answered 429 on the eighth and ninth (ADR
   0005), so candles are fetched only for the one Chart being analyzed and the
   list is drawn from `/coins/markets`, which prices all of them at once. */

import { fetchJson, type FetchLike } from '@/lib/fetch-json';
import type { Instrument } from '@/lib/instruments';
import { PRICES_RATE_LIMITED, PRICES_UNAVAILABLE, PRICES_UNREADABLE } from '@/lib/market-copy';
import { UserFacingError } from '@/lib/user-facing-error';

export type MarketQuote = {
  instrument: Instrument;
  /* What one of them costs right now, in kroner. */
  price: number;
  /* How that price has moved over the week the preview covers, in percent. */
  changePercent: number;
  /* A week of prices, oldest first. A shape and never a number: this leg is
     quoted in dollars whatever currency was asked for, so it carries no axis,
     no label, and nothing that could be read as the price above it. */
  preview: number[];
};

const MARKETS_ENDPOINT = 'https://api.coingecko.com/api/v3/coins/markets';
const QUOTE_CURRENCY = 'nok';
/* The window the preview covers, and so the window the move is measured over:
   one caption under one shape, saying one thing. */
const PREVIEW_WINDOW = '7d';

function marketsUrl(instruments: Instrument[]): string {
  const query = new URLSearchParams({
    vs_currency: QUOTE_CURRENCY,
    ids: instruments.map((instrument) => instrument.coinGeckoId).join(','),
    sparkline: 'true',
    price_change_percentage: PREVIEW_WINDOW,
  });
  return `${MARKETS_ENDPOINT}?${query}`;
}

type PricedRow = {
  id: string;
  price: number;
  changePercent: number;
  preview: number[];
};

const isNumber = (value: unknown): value is number => Number.isFinite(value);

function toPricedRow(row: unknown): PricedRow {
  const priced = row as {
    id?: unknown;
    current_price?: unknown;
    price_change_percentage_7d_in_currency?: unknown;
    sparkline_in_7d?: { price?: unknown };
  } | null;
  const preview = priced?.sparkline_in_7d?.price;

  if (
    typeof priced?.id !== 'string' ||
    !isNumber(priced.current_price) ||
    !Array.isArray(preview) ||
    !preview.every(isNumber)
  ) {
    throw new UserFacingError(PRICES_UNREADABLE);
  }

  return {
    id: priced.id,
    price: priced.current_price,
    /* A coin listed less than a week ago has no week to compare against, and a
       missing move is not a broken answer - it is a flat one. */
    changePercent: isNumber(priced.price_change_percentage_7d_in_currency)
      ? priced.price_change_percentage_7d_in_currency
      : 0,
    preview,
  };
}

/* The Market, priced. Takes the Instruments Firi is selling rather than the
   whole catalogue, so nothing is priced that cannot be bought. `fetch` is the
   last argument, the way every other module here takes its client. */
export async function fetchMarket(
  instruments: Instrument[],
  fetchImpl: FetchLike = fetch,
): Promise<MarketQuote[]> {
  const payload = await fetchJson(marketsUrl(instruments), fetchImpl, {
    unreachable: PRICES_UNAVAILABLE,
    unreadable: PRICES_UNREADABLE,
    rateLimited: PRICES_RATE_LIMITED,
  });

  if (!Array.isArray(payload)) throw new UserFacingError(PRICES_UNREADABLE);
  const priced = new Map(payload.map(toPricedRow).map((row) => [row.id, row]));

  /* The order asked for, not the order priced: the answer comes back sorted by
     what these coins are worth in total, which is not what the app offers. */
  const quotes = instruments.flatMap((instrument) => {
    const row = priced.get(instrument.coinGeckoId);
    /* One Instrument the price source has never heard of is one card short,
       not the screen gone. */
    return row
      ? [{ instrument, price: row.price, changePercent: row.changePercent, preview: row.preview }]
      : [];
  });

  /* Nothing priced at all is a broken answer, not an empty market. */
  if (quotes.length === 0) throw new UserFacingError(PRICES_UNREADABLE);
  return quotes;
}

/* Every preview floors its price range at this much of the price. Nine cards
   that each scale to their own range make a coin that moved 0.05% look exactly
   like one that moved 5%; the floor is what makes a quiet day render quiet. It
   is correctness, not style (ADR 0005). */
export const MIN_PREVIEW_RANGE = 0.04;

export type PreviewPoint = { x: number; y: number };

/* The week's shape, in a box `width` by `height`, y measured downwards the way
   a screen measures it. */
export function previewPoints(prices: number[], width: number, height: number): PreviewPoint[] {
  /* One price is not a shape, and a line through it draws nothing. */
  if (prices.length < 2) return [];

  const highest = Math.max(...prices);
  const lowest = Math.min(...prices);
  const middle = (highest + lowest) / 2;
  const span = Math.max(highest - lowest, Math.abs(middle) * MIN_PREVIEW_RANGE);
  /* The real range sits centred in the floored one, so a quiet week is a line
     across the middle rather than a line pinned to an edge. */
  const top = middle + span / 2;
  const step = width / (prices.length - 1);

  return prices.map((price, index) => ({
    x: step * index,
    /* A price that never moved has no range to scale to, so it sits mid-box. */
    y: span > 0 ? ((top - price) / span) * height : height / 2,
  }));
}
