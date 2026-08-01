import type { Instrument } from '../instruments';
import { MIN_PREVIEW_RANGE, fetchMarket, previewPoints } from '../market';
import { PRICES_RATE_LIMITED, PRICES_UNAVAILABLE, PRICES_UNREADABLE } from '../market-copy';
import { UserFacingError } from '../user-facing-error';
import { offlineFetch, stubFetch } from '@/test-support/stub-fetch';

const instrument = (symbol: string, coinGeckoId: string, stable = false): Instrument => ({
  symbol,
  name: symbol,
  coinGeckoId,
  stable,
});

const LISTED = [
  instrument('BTC', 'bitcoin'),
  instrument('ETH', 'ethereum'),
  instrument('USDC', 'usd-coin', true),
];

/* One row per Instrument, the way CoinGecko answers `/coins/markets`. The
   sparkline is a week of hourly prices; three stand in for it here. */
const row = (id: string, price: number, change: number, sparkline: number[]) => ({
  id,
  symbol: id.slice(0, 3),
  name: id,
  current_price: price,
  price_change_percentage_7d_in_currency: change,
  sparkline_in_7d: { price: sparkline },
});

const COIN_GECKO = [
  row('ethereum', 41_000, -1.2, [42_000, 41_500, 41_000]),
  row('bitcoin', 1_240_000, 2.4, [1_200_000, 1_260_000, 1_240_000]),
  row('usd-coin', 10.11, 0.01, [10.1, 10.12, 10.11]),
];

const symbolsOf = (quotes: { instrument: Instrument }[]) =>
  quotes.map((quote) => quote.instrument.symbol);

describe('fetchMarket', () => {
  /* Nine `/ohlc` calls answer 429 on the free tier (ADR 0005), so the whole
     screen is one request or it is nothing. */
  it('asks for every Instrument at once, in kroner, with a week of shape', async () => {
    const fetchImpl = stubFetch(COIN_GECKO);

    await fetchMarket(LISTED, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const url = fetchImpl.mock.calls[0][0];
    expect(url).toContain('/coins/markets');
    expect(url).toContain('vs_currency=nok');
    expect(url).toContain('ids=bitcoin%2Cethereum%2Cusd-coin');
    expect(url).toContain('sparkline=true');
    expect(url).toContain('price_change_percentage=7d');
  });

  it('carries the price, the move and the week of prices onto each Instrument', async () => {
    const quotes = await fetchMarket(LISTED, stubFetch(COIN_GECKO));

    expect(quotes[0]).toEqual({
      instrument: LISTED[0],
      price: 1_240_000,
      changePercent: 2.4,
      preview: [1_200_000, 1_260_000, 1_240_000],
    });
  });

  it('keeps the order it was given, however the prices come back', async () => {
    const quotes = await fetchMarket(LISTED, stubFetch(COIN_GECKO));

    expect(symbolsOf(quotes)).toEqual(['BTC', 'ETH', 'USDC']);
  });

  /* An Instrument Firi sells that the price source has never heard of is one
     card short, not nine cards missing. */
  it('leaves out an Instrument with no price rather than failing the screen', async () => {
    const quotes = await fetchMarket(LISTED, stubFetch([COIN_GECKO[1]]));

    expect(symbolsOf(quotes)).toEqual(['BTC']);
  });

  it('fails when nothing in the answer is priced', async () => {
    await expect(fetchMarket(LISTED, stubFetch([]))).rejects.toThrow(PRICES_UNREADABLE);
  });

  /* Its own words: "wait a minute" is a different instruction from "check your
     connection", and folding the two loses the one the user can act on. */
  it('says a rate limit is a rate limit and not a network fault', async () => {
    const limited = await fetchMarket(LISTED, stubFetch('', { ok: false, status: 429 })).catch(
      (caught) => caught,
    );

    expect(limited).toBeInstanceOf(UserFacingError);
    expect(limited.message).toBe(PRICES_RATE_LIMITED);
    expect(limited.message).not.toBe(PRICES_UNAVAILABLE);
  });

  it('fails when the prices cannot be reached', async () => {
    await expect(fetchMarket(LISTED, stubFetch('', { ok: false, status: 500 }))).rejects.toThrow(
      PRICES_UNAVAILABLE,
    );

    await expect(fetchMarket(LISTED, offlineFetch())).rejects.toThrow(PRICES_UNAVAILABLE);
  });

  it('fails on an answer it cannot read rather than pricing half the list', async () => {
    const malformed = [
      { status: 'ok' },
      [{ ...row('bitcoin', 1, 1, [1, 2]), current_price: 'lots' }],
      [{ ...row('bitcoin', 1, 1, [1, 2]), sparkline_in_7d: { price: ['up', 'down'] } }],
    ];

    for (const body of malformed) {
      const error = await fetchMarket(LISTED, stubFetch(body)).catch((caught) => caught);
      expect(error).toBeInstanceOf(UserFacingError);
      expect(error.message).toBe(PRICES_UNREADABLE);
    }
  });
});

const WIDTH = 100;
const HEIGHT = 40;

/* A straight run from one price to another, which is all these rules care
   about: the preview is a shape, and its only question is how tall it gets. */
const moving = (from: number, to: number, count = 8) =>
  Array.from({ length: count }, (_, index) => from + ((to - from) * index) / (count - 1));

const heightOf = (points: { y: number }[]) => {
  const ys = points.map((point) => point.y);
  return Math.max(...ys) - Math.min(...ys);
};

describe('previewPoints', () => {
  it('spans the full width, first price to last', () => {
    const points = previewPoints(moving(100, 110), WIDTH, HEIGHT);

    expect(points).toHaveLength(8);
    expect(points[0].x).toBe(0);
    expect(points[points.length - 1].x).toBe(WIDTH);
  });

  it('uses the whole box for a move bigger than the floor', () => {
    const points = previewPoints(moving(100, 110), WIDTH, HEIGHT);

    expect(heightOf(points)).toBe(HEIGHT);
    expect(Math.min(...points.map((point) => point.y))).toBe(0);
    expect(Math.max(...points.map((point) => point.y))).toBe(HEIGHT);
  });

  /* The rule ADR 0005 calls correctness: nine previews that each scale to
     their own range make a coin that barely moved look like one that ran. */
  it('renders a quiet day quiet and a busy one busy', () => {
    const quiet = previewPoints(moving(100, 100.05), WIDTH, HEIGHT);
    const busy = previewPoints(moving(100, 105), WIDTH, HEIGHT);

    expect(heightOf(quiet)).toBeLessThan(heightOf(busy) / 50);
  });

  it('scales a move smaller than the floor against the floor, not against itself', () => {
    const prices = moving(100, 102);
    const middle = 101;
    const floor = middle * MIN_PREVIEW_RANGE;

    expect(heightOf(previewPoints(prices, WIDTH, HEIGHT))).toBeCloseTo((HEIGHT * 2) / floor, 6);
  });

  it('draws a price that never moved as one flat line down the middle', () => {
    const points = previewPoints([10.1, 10.1, 10.1, 10.1], WIDTH, HEIGHT);

    expect(heightOf(points)).toBe(0);
    for (const point of points) expect(point.y).toBeCloseTo(HEIGHT / 2, 6);
  });

  it('keeps every point inside the box', () => {
    for (const prices of [moving(100, 90), moving(100, 100.01), [5, 900, 5, 900]]) {
      for (const point of previewPoints(prices, WIDTH, HEIGHT)) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(WIDTH);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(HEIGHT);
      }
    }
  });

  /* One point is not a shape, and a polyline through it draws nothing. */
  it('has nothing to draw with fewer than two prices', () => {
    expect(previewPoints([], WIDTH, HEIGHT)).toEqual([]);
    expect(previewPoints([10], WIDTH, HEIGHT)).toEqual([]);
  });
});
