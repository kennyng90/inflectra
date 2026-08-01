/* Turns a pick - an Instrument and a Time resolution - into everything needed to
   draw a Chart: the candles, where they sit, and what the axes say. Fetching and
   validating live here too, so the renderer below is a pure function of this and
   this is the only part worth testing. */

import type { ChartOrigin, TimeResolution } from '@/lib/chart-origin';
import {
  MARKET_DATA_UNREACHABLE,
  MARKET_DATA_UNREADABLE,
  NOT_ENOUGH_MARKET_DATA,
  TIME_RESOLUTION_COPY,
  drawnChartTitle,
} from '@/lib/drawn-chart-copy';
import { UserFacingError } from '@/lib/user-facing-error';

/* Only the part of `fetch` this module uses, so a test can stand in for it
   without building a whole Response. */
export type FetchLike = (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

export type Instrument = {
  /* Written onto the Analysis row as the Chart's origin. */
  symbol: string;
  /* What the Chart's title calls it. */
  name: string;
  coinGeckoId: string;
};

/* Instruments Inflectra can draw today. Picking from a list is what stops the
   user asking for something CoinGecko has never heard of. */
export const INSTRUMENTS: Instrument[] = [
  { symbol: 'BTC', name: 'Bitcoin', coinGeckoId: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', coinGeckoId: 'ethereum' },
];

export type DrawnChartPick = { instrument: string; timeResolution: TimeResolution };

/* The tracer bullet draws one thing. The pick becomes the user's on its own
   ticket; everything below here already reads it from the argument. */
export const DEFAULT_DRAWN_CHART_PICK: DrawnChartPick = {
  instrument: 'BTC',
  timeResolution: 'thirty_days',
};

/* CoinGecko has no granularity parameter: the range asked for picks it. What it
   does have is a closed list of ranges - 1, 7, 14, 30, 90, 180, 365 - and no key
   buys past it. `days=2` is answered "Invalid days parameter" (measured
   2026-08-01), so the half-hour resolution reaches back one day, not the two
   ADR 0003 assumed. The contract still calls it `two_days`; renaming a value
   both sides validate is a spine change of its own. */
const DAYS_FOR: Record<TimeResolution, number> = { two_days: 1, thirty_days: 30 };

const OHLC_ENDPOINT = 'https://api.coingecko.com/api/v3/coins';
const QUOTE_CURRENCY = 'nok';

/* Fewer than this and there is no shape to read, only noise. */
export const MIN_CANDLES = 24;

/* The drawing's own coordinate space. The renderer scales it to the device, so
   these are the numbers every coordinate below is expressed in. */
export const DRAWING_WIDTH = 1000;
export const DRAWING_HEIGHT = 640;
/* Room for the title above, the price labels to the right, the dates below. */
const PADDING = { top: 116, right: 128, bottom: 72, left: 56 };

const PRICE_TICK_COUNT = 5;
const TIME_TICK_COUNT = 5;
/* A candle that opened and closed at the same price still has to be visible. */
const MIN_BODY_HEIGHT = 2;
const BODY_WIDTH_RATIO = 0.7;

export type DrawnCandle = {
  /* Centre of the candle; the wick is drawn on it. */
  x: number;
  width: number;
  wickTop: number;
  wickBottom: number;
  bodyTop: number;
  bodyHeight: number;
  rising: boolean;
};

export type PriceTick = { price: number; label: string; y: number };
export type TimeTick = { label: string; x: number };

export type DrawnChart = {
  origin: ChartOrigin;
  title: string;
  subtitle: string;
  size: { width: number; height: number };
  plot: { x: number; y: number; width: number; height: number };
  candles: DrawnCandle[];
  priceTicks: PriceTick[];
  timeTicks: TimeTick[];
};

type Candle = { time: number; open: number; high: number; low: number; close: number };

function instrumentFor(symbol: string): Instrument {
  const instrument = INSTRUMENTS.find((candidate) => candidate.symbol === symbol);
  /* Not a user's mistake: the list is the only way to ask for one. */
  if (!instrument) throw new Error(`No instrument named ${symbol}`);
  return instrument;
}

function ohlcUrl(instrument: Instrument, timeResolution: TimeResolution): string {
  const days = DAYS_FOR[timeResolution];
  return `${OHLC_ENDPOINT}/${instrument.coinGeckoId}/ohlc?vs_currency=${QUOTE_CURRENCY}&days=${days}`;
}

/* One candle per row: [openTimeMs, open, high, low, close]. Later columns, if
   CoinGecko ever adds any, are not read. */
function isOhlcRow(row: unknown): row is [number, number, number, number, number] {
  return (
    Array.isArray(row) && row.length >= 5 && row.slice(0, 5).every((value) => Number.isFinite(value))
  );
}

function toCandles(payload: unknown): Candle[] {
  if (!Array.isArray(payload)) throw new UserFacingError(MARKET_DATA_UNREADABLE);

  return payload.map((row) => {
    if (!isOhlcRow(row)) throw new UserFacingError(MARKET_DATA_UNREADABLE);
    const [time, open, high, low, close] = row;
    return { time, open, high, low, close };
  });
}

/* Takes the URL already built, so resolving the Instrument - a bug when it
   fails, not a network fault - stays outside the reach of the catch below. */
async function fetchCandles(url: string, fetchImpl: FetchLike): Promise<Candle[]> {
  let response: Awaited<ReturnType<FetchLike>>;
  try {
    response = await fetchImpl(url);
  } catch {
    throw new UserFacingError(MARKET_DATA_UNREACHABLE);
  }
  if (!response.ok) throw new UserFacingError(MARKET_DATA_UNREACHABLE);

  const payload = await response.json().catch(() => {
    throw new UserFacingError(MARKET_DATA_UNREADABLE);
  });

  const candles = toCandles(payload);
  if (candles.length < MIN_CANDLES) throw new UserFacingError(NOT_ENOUGH_MARKET_DATA);
  return candles;
}

/* Coarser as the price grows, so a label never runs into the one beside it. */
function priceDecimals(price: number): number {
  if (price >= 1000) return 0;
  if (price >= 10) return 1;
  return 4;
}

/* Norwegian numbers: space between thousands, comma before decimals. */
function formatPrice(price: number): string {
  const [whole, fraction] = price.toFixed(priceDecimals(price)).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return fraction ? `${grouped},${fraction}` : grouped;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* Half-hour candles are read as a time of day; a month of them as a date. */
function formatTime(time: number, timeResolution: TimeResolution): string {
  const at = new Date(time);
  if (timeResolution === 'two_days') {
    return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
  }
  return `${at.getDate()} ${MONTHS[at.getMonth()]}`;
}

/* Evenly spaced positions across `count` items, ends included. */
function spread(count: number, steps: number): number[] {
  const taken = Math.min(steps, count);
  if (taken < 2) return [0];
  return Array.from({ length: taken }, (_, index) =>
    Math.round((index * (count - 1)) / (taken - 1)),
  );
}

function layout(
  candles: Candle[],
  instrument: Instrument,
  timeResolution: TimeResolution,
): Omit<DrawnChart, 'origin'> {
  const plot = {
    x: PADDING.left,
    y: PADDING.top,
    width: DRAWING_WIDTH - PADDING.left - PADDING.right,
    height: DRAWING_HEIGHT - PADDING.top - PADDING.bottom,
  };
  const bottom = plot.y + plot.height;

  const highest = Math.max(...candles.map((candle) => candle.high));
  const lowest = Math.min(...candles.map((candle) => candle.low));
  const span = highest - lowest;
  /* A market that never moved has no range to scale to, so it sits mid-plot. */
  const y = (price: number) =>
    span > 0 ? plot.y + ((highest - price) / span) * plot.height : plot.y + plot.height / 2;

  const step = plot.width / candles.length;
  const width = step * BODY_WIDTH_RATIO;

  const drawn = candles.map((candle, index) => {
    const top = y(Math.max(candle.open, candle.close));
    const bodyHeight = Math.max(y(Math.min(candle.open, candle.close)) - top, MIN_BODY_HEIGHT);
    return {
      x: plot.x + step * (index + 0.5),
      width,
      wickTop: y(candle.high),
      wickBottom: y(candle.low),
      /* Lifted off the floor when the floor is where a doji landed. */
      bodyTop: Math.min(top, bottom - bodyHeight),
      bodyHeight,
      rising: candle.close >= candle.open,
    };
  });

  const priceTicks = Array.from({ length: PRICE_TICK_COUNT }, (_, index) => {
    const price = highest - (span * index) / (PRICE_TICK_COUNT - 1);
    return { price, label: formatPrice(price), y: y(price) };
  });

  const timeTicks = spread(candles.length, TIME_TICK_COUNT).map((index) => ({
    label: formatTime(candles[index].time, timeResolution),
    x: drawn[index].x,
  }));

  return {
    title: drawnChartTitle(instrument.name),
    subtitle: TIME_RESOLUTION_COPY[timeResolution].onChart,
    size: { width: DRAWING_WIDTH, height: DRAWING_HEIGHT },
    plot,
    candles: drawn,
    priceTicks,
    timeTicks,
  };
}

/* Everything a renderer needs for one Chart. `fetch` is the last argument, the
   way every other module here takes its client. */
export async function buildDrawnChart(
  pick: DrawnChartPick,
  fetchImpl: FetchLike = fetch,
): Promise<DrawnChart> {
  const instrument = instrumentFor(pick.instrument);
  const candles = await fetchCandles(ohlcUrl(instrument, pick.timeResolution), fetchImpl);
  return {
    origin: { instrument: pick.instrument, time_resolution: pick.timeResolution },
    ...layout(candles, instrument, pick.timeResolution),
  };
}
