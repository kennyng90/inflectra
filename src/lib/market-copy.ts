/* What the app says on the Market: the screen's own words, and the words it
   uses about a price wherever one is shown. */

import { norwegianNumber } from '@/lib/norwegian-number';

export const MARKET_TITLE = 'Market';
/* The other way in, kept where it has always been: a picture of the user's own.
   Second on this screen, not gone from it. */
export const OWN_CHART_ACTION = 'Use a picture of my own';

/* Shown wherever a price from the wider market is - beside a drawn Analysis and
   on the Market itself - so the levels are never read as the user's exchange.
   It never stands in for the disclaimer every Analysis carries. */
export const MARKET_PRICE_NOTE =
  'Prices here follow the wider market, so they can differ a little from your exchange.';

/* What the preview under each price covers. Said once per card, because the
   number beside it is meaningless without it. */
export const PAST_WEEK = 'Past week';

export const PRICES_LOADING = 'Loading prices…';
/* Heads the whole screen when there are no prices to show at all; the message
   underneath says which way it failed. */
export const PRICES_FAILED_TITLE = "Prices didn't load";
export const PRICES_UNAVAILABLE =
  "We couldn't load today's prices. Check your connection and try again.";
export const PRICES_UNREADABLE = "We couldn't read today's prices. Try again.";
/* Its own message, not folded into the one above: waiting is the thing to do
   here, and checking your connection is not. */
export const PRICES_RATE_LIMITED =
  "We've asked for prices too many times just now. Wait a minute and try again.";
/* The way on the messages above offer. */
export const PRICES_RETRY = 'Try again';

/* Rising, Falling, Flat - the app's three words for a direction, here about a
   price over a week rather than about a Chart. */
export type PriceDirection = 'rising' | 'falling' | 'flat';

export type PriceMove = {
  /* The arrow and the size of the move, for reading at a glance. */
  label: string;
  /* The same fact in words, for a screen reader and for colour-blind eyes. */
  spoken: string;
  direction: PriceDirection;
};

const MOVE_DECIMALS = 1;
const ARROW: Record<PriceDirection, string> = { rising: '↑', falling: '↓', flat: '' };
const SPOKEN: Record<PriceDirection, string> = {
  rising: 'Rising',
  falling: 'Falling',
  flat: 'Flat',
};

/* Flat is whatever rounds to nothing at the precision shown, so no card ever
   claims a direction next to a "0,0%" that contradicts it. */
function directionOf(rounded: number): PriceDirection {
  if (rounded > 0) return 'rising';
  if (rounded < 0) return 'falling';
  return 'flat';
}

/* How a price has moved over the week the preview covers. */
export function priceMove(percent: number): PriceMove {
  const rounded = Number(percent.toFixed(MOVE_DECIMALS));
  const direction = directionOf(rounded);
  const size = `${norwegianNumber(Math.abs(rounded), MOVE_DECIMALS)}%`;
  return {
    label: direction === 'flat' ? size : `${ARROW[direction]} ${size}`,
    spoken: `${SPOKEN[direction]} ${size} over the past week`,
    direction,
  };
}

/* A price is written to the precision that tells the reader something: kroner
   for something that costs thousands, øre for something that costs one. */
function priceDecimals(price: number): number {
  if (price >= 1000) return 0;
  if (price >= 1) return 2;
  return 4;
}

/* An amount with its unit after it, the one way the app writes kroner - beside
   a price on the Market, and once at the top of a drawn Chart's price axis, so
   a level read off the middle of that axis is still a number of kroner. */
export function kronerLabel(amount: string): string {
  return `${amount} kr`;
}

/* What one of a thing costs right now, in kroner. */
export function priceInKroner(price: number): string {
  return kronerLabel(norwegianNumber(price, priceDecimals(price)));
}
