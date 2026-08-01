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
/* The AI could not read a Chart we drew ourselves. That is a defect in our own
   drawing, so it reads as ours to fix rather than as a Rejection. */
export const DRAWN_CHART_UNREADABLE = "We couldn't draw a readable chart this time. Try again.";

/* Heads the two Time resolutions where they are offered. The question is what
   the user is actually deciding; how coarse the steps come out is the price
   data's answer to it, not theirs, so that is left to the detail on each one. */
export const PICK_TIME_RESOLUTION_TITLE = 'How far back?';

export type TimeResolutionCopy = {
  /* What the choice is called. */
  label: string;
  /* What picking it gets you, in plain words. */
  detail: string;
  /* How much trading one candle covers, said the way the Chart says it. */
  step: string;
};

export const TIME_RESOLUTION_COPY: Record<TimeResolution, TimeResolutionCopy> = {
  /* One day, not two: the price data only comes in the ranges listed in
     `drawn-chart`, and two days is not one of them. */
  two_days: {
    label: 'Close up',
    detail: 'One day of trading, in half-hour steps',
    step: 'half-hour steps',
  },
  thirty_days: {
    label: 'Wide view',
    detail: 'One month of trading, in four-hour steps',
    step: 'four-hour steps',
  },
};

/* The Chart says what it shows and what the numbers are in: kroner for the
   reader, NOK for the AI. */
export function drawnChartTitle(instrumentName: string): string {
  return `${instrumentName} in kroner (NOK)`;
}

/* Under the title: which days are drawn and how much of one a candle is. The
   dates are what "Thirty days" cannot say once the day it was drawn on has
   passed, which is the whole point of writing this into the image. */
export function drawnChartSubtitle(days: string, timeResolution: TimeResolution): string {
  return `${days}, in ${TIME_RESOLUTION_COPY[timeResolution].step}`;
}
