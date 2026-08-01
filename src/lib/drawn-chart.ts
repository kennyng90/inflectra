/* Turns a pick - an Instrument and a Time resolution - into everything needed to
   draw a Chart: the candles, where they sit, and what the axes say. Fetching and
   validating live here too, so the renderer below is a pure function of this and
   this is the only part worth testing. */

import type { ChartOrigin, TimeResolution } from '@/lib/chart-origin';
import {
  MARKET_DATA_UNREACHABLE,
  MARKET_DATA_UNREADABLE,
  NOT_ENOUGH_MARKET_DATA,
  drawnChartSubtitle,
  drawnChartTitle,
  kronerLabel,
} from '@/lib/drawn-chart-copy';
import { fetchJson, type FetchLike } from '@/lib/fetch-json';
import { instrumentFor, type Instrument } from '@/lib/instruments';
import { UserFacingError } from '@/lib/user-facing-error';
/* The scale itself, not a theme: the geometry is the same in light and dark,
   and this module has no component to read `useTheme()` from. */
import { spacing } from '@/theme/tokens';

export type DrawnChartPick = { instrument: string; timeResolution: TimeResolution };

/* The Time resolution every drawn Chart is made at until picking one gets its
   own ticket. Nothing here reads it: a pick carries its own. */
export const DEFAULT_TIME_RESOLUTION: TimeResolution = 'thirty_days';

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

/* The drawing's own coordinate space, in the theme's units: the renderer halves
   it on the way to the device, so a heading here reads as half a heading beside
   the Chart, which is the size an axis wants and a screen never asks for.
   Every distance inside it comes off the spacing scale. */
export const DRAWING_WIDTH = 720;
export const DRAWING_HEIGHT = 480;
/* Room for the title above, the price labels to the right, the dates below.
   The right has to hold the widest price label the canvas will draw there. */
const PADDING = {
  top: spacing.space80,
  right: spacing.space128,
  bottom: spacing.space40,
  left: spacing.space24,
};

const PRICE_TICK_COUNT = 5;
const TIME_TICK_COUNT = 5;
/* A candle that opened and closed at the same price still has to be visible. */
const MIN_BODY_HEIGHT = spacing.space2;
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
   fails, not a network fault - never gets reported as unreachable price data. */
async function fetchCandles(url: string, fetchImpl: FetchLike): Promise<Candle[]> {
  const payload = await fetchJson(url, fetchImpl, {
    unreachable: MARKET_DATA_UNREACHABLE,
    unreadable: MARKET_DATA_UNREADABLE,
  });

  const candles = toCandles(payload);
  if (candles.length < MIN_CANDLES) throw new UserFacingError(NOT_ENOUGH_MARKET_DATA);
  return candles;
}

/* Long labels crowd the axis, so there is a ceiling on how fine one gets. */
const MAX_PRICE_DECIMALS = 4;

/* One precision for the whole price axis, chosen from the gap between two
   ticks rather than from how big the numbers are: a stable Instrument's whole
   range can sit inside an øre, where a krone-precise label repeats itself five
   times and the axis stops being something a level can be checked against. */
function priceDecimals(highest: number, span: number): number {
  const gap = span / (PRICE_TICK_COUNT - 1);
  /* A market that never moved has no gap to resolve, only a size. */
  if (gap <= 0) return highest >= 1000 ? 0 : 2;
  return Math.min(Math.max(Math.ceil(-Math.log10(gap)), 0), MAX_PRICE_DECIMALS);
}

/* Norwegian numbers: space between thousands, comma before decimals. */
function formatPrice(price: number, decimals: number): string {
  const [whole, fraction] = price.toFixed(decimals).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return fraction ? `${grouped},${fraction}` : grouped;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function day(at: Date): string {
  return `${at.getDate()} ${MONTHS[at.getMonth()]}`;
}

/* Half-hour candles are read as a time of day; a month of them as a date. */
function formatTime(time: number, timeResolution: TimeResolution): string {
  const at = new Date(time);
  if (timeResolution === 'two_days') {
    return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
  }
  return day(at);
}

function dated(at: Date): string {
  return `${day(at)} ${at.getFullYear()}`;
}

/* The days the candles cover, for someone reading the image on its own: the
   year always, since nothing else in the picture can supply it, and the
   start's year only where it differs from the end's. */
function formatDays(from: number, to: number): string {
  const start = new Date(from);
  const end = new Date(to);
  if (dated(start) === dated(end)) return dated(end);
  const sameYear = start.getFullYear() === end.getFullYear();
  return `${sameYear ? day(start) : dated(start)} – ${dated(end)}`;
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

  const decimals = priceDecimals(highest, span);
  const priceTicks = Array.from({ length: PRICE_TICK_COUNT }, (_, index) => {
    const price = highest - (span * index) / (PRICE_TICK_COUNT - 1);
    const amount = formatPrice(price, decimals);
    /* Only the top of the column carries the unit: on every tick it would be
       four repetitions of a fact one statement settles. */
    return { price, label: index === 0 ? kronerLabel(amount) : amount, y: y(price) };
  });

  const timeTicks = spread(candles.length, TIME_TICK_COUNT).map((index) => ({
    label: formatTime(candles[index].time, timeResolution),
    x: drawn[index].x,
  }));

  return {
    title: drawnChartTitle(instrument.name),
    subtitle: drawnChartSubtitle(
      formatDays(candles[0].time, candles[candles.length - 1].time),
      timeResolution,
    ),
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
  /* Not a user's mistake: the list they pick from is drawn from this same
     catalogue, so a symbol off it got here through a bug. */
  if (!instrument) throw new Error(`No instrument named ${pick.instrument}`);

  const candles = await fetchCandles(ohlcUrl(instrument, pick.timeResolution), fetchImpl);
  return {
    origin: { instrument: pick.instrument, time_resolution: pick.timeResolution },
    ...layout(candles, instrument, pick.timeResolution),
  };
}
