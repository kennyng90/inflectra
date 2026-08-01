/* What the app says about a Chart it draws itself. The labels here are read
   twice: by the user looking at the Chart, and by the AI reading the image. */

import type { TimeResolution } from '@/lib/chart-origin';

export const DRAW_CHART_ACTION = 'Draw a chart for me';
/* The same button while the drawing is being made. */
export const DRAWING_CHART_ACTION = 'Drawing a chart…';

export const MARKET_DATA_UNREACHABLE =
  "We couldn't reach the price data. Check your connection and try again.";
export const MARKET_DATA_UNREADABLE = "We couldn't read the price data. Try again.";
export const NOT_ENOUGH_MARKET_DATA =
  "There isn't enough recent price data to draw a chart. Try again later.";
/* Anything else that stopped the drawing. The user did not supply the image, so
   nothing here blames them for it. */
export const DRAWING_FAILED = "We couldn't draw a chart just now. Try again.";

/* Shown beside a drawn Chart, never instead of the disclaimer every Analysis
   carries: the prices come from the wider market rather than the user's own
   exchange, so the levels are indicative and not something to trade off blind. */
export const MARKET_PRICE_NOTE =
  'Prices here follow the wider market, so they can differ a little from your exchange.';

export type TimeResolutionCopy = {
  /* What the choice is called. */
  label: string;
  /* What picking it gets you, in plain words. */
  detail: string;
  /* Written onto the Chart, so a saved image still says what it covers. */
  onChart: string;
};

export const TIME_RESOLUTION_COPY: Record<TimeResolution, TimeResolutionCopy> = {
  /* One day, not two: the price data only comes in the ranges listed in
     `drawn-chart`, and two days is not one of them. */
  two_days: {
    label: 'Close up',
    detail: 'One day of trading, in half-hour steps',
    onChart: 'One day, in half-hour steps',
  },
  thirty_days: {
    label: 'Wide view',
    detail: 'One month of trading, in four-hour steps',
    onChart: 'Thirty days, in four-hour steps',
  },
};

/* The Chart says what it shows and what the numbers are in: kroner for the
   reader, NOK for the AI. */
export function drawnChartTitle(instrumentName: string): string {
  return `${instrumentName} in kroner (NOK)`;
}
