/* Plain-language presentation of the contract's values. Every user-facing word
   assumes zero trading knowledge; the trading term appears only as a hint. */
import type { Direction, Trend } from '@/lib/analysis-contract';

/* Crypto prices run to many decimals, stock prices to two. */
const priceFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 8 });

export function formatPrice(value: number): string {
  return priceFormat.format(value);
}

export function formatPercent(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export const trendCopy: Record<Trend, { label: string; arrow: string }> = {
  bullish: { label: 'Rising', arrow: '↗' },
  bearish: { label: 'Falling', arrow: '↘' },
  sideways: { label: 'Flat', arrow: '→' },
};

type DirectionCopy = {
  headline: string;
  sub: string;
  entry: string;
  entryHint: string;
  stop: string;
  stopHint: string;
  target: string;
  targetHint: string;
};

export const directionCopy: Record<Direction, DirectionCopy> = {
  long: {
    headline: 'Buy',
    sub: 'The AI thinks the price will go up.',
    entry: 'Buy at this price',
    entryHint: 'This is where the trade starts',
    stop: 'Emergency exit',
    stopHint: 'If the price falls this low, sell to stop the loss',
    target: 'Sell target',
    targetHint: 'Sell here to lock in gains',
  },
  short: {
    headline: 'Sell',
    sub: 'The AI thinks the price will go down.',
    entry: 'Sell at this price',
    entryHint: 'This is where the trade starts',
    stop: 'Emergency exit',
    stopHint: 'If the price climbs this high, buy back to stop the loss',
    target: 'Buy-back target',
    targetHint: 'Buy back here to lock in gains',
  },
  hold: {
    headline: 'Wait',
    sub: 'The AI suggests waiting until the chart is clearer.',
    entry: 'Price to watch',
    entryHint: 'The trade only makes sense from here',
    stop: 'Emergency exit',
    stopHint: 'Below this price the idea no longer holds',
    target: 'Target',
    targetHint: 'Where the price could get to',
  },
};

export const DISCLAIMER = 'This is for learning, not financial advice. Inflectra never trades for you.';
