/* Plain-language presentation of the contract's values. Every user-facing word
   assumes zero trading knowledge; the trading term appears only as a hint. */
import type { Direction, Strategy, Trend } from '@/lib/analysis-contract';

/* Crypto prices run to many decimals, stock prices to two. */
const priceFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 8 });

export function formatPrice(value: number): string {
  return priceFormat.format(value);
}

export function formatPercent(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export function formatDelta(price: number, entry: number): string | null {
  if (entry === 0) return null;
  const change = ((price - entry) / entry) * 100;
  const value = change.toFixed(1);
  /* A tiny move rounds to zero either way, so it gets no sign at all. */
  if (value === '0.0' || value === '-0.0') return '0.0%';
  return value.startsWith('-') ? `${value}%` : `+${value}%`;
}

export const trendCopy: Record<Trend, { label: string; arrow: string }> = {
  bullish: { label: 'Rising', arrow: '↗' },
  bearish: { label: 'Falling', arrow: '↘' },
  sideways: { label: 'Flat', arrow: '→' },
};

type DirectionCopy = {
  headline: string;
  /* Completes "Why the AI says ...". */
  verb: string;
  sub: string;
  entry: string;
  entryHint: string;
  stop: string;
  stopHint: string;
  target: string;
  firstTargetHint: string;
  nextTargetHint: string;
  ladderNote: string;
};

export const directionCopy: Record<Direction, DirectionCopy> = {
  long: {
    headline: 'Buy',
    verb: 'buy',
    sub: 'The AI thinks the price will go up.',
    entry: 'Buy at this price',
    entryHint: 'This is where the trade starts',
    stop: 'Emergency exit',
    stopHint: 'If the price falls this low, sell to stop the loss',
    target: 'Sell target',
    firstTargetHint: 'Sell here first to lock in gains',
    nextTargetHint: 'If it keeps climbing, sell the rest here',
    ladderNote: 'Each percentage shows how far that price is from your buy price.',
  },
  short: {
    headline: 'Sell',
    verb: 'sell',
    sub: 'The AI thinks the price will go down.',
    entry: 'Sell at this price',
    entryHint: 'This is where the trade starts',
    stop: 'Emergency exit',
    stopHint: 'If the price climbs this high, buy back to stop the loss',
    target: 'Buy-back target',
    firstTargetHint: 'Buy back here first to lock in gains',
    nextTargetHint: 'If it keeps falling, buy back the rest here',
    ladderNote: 'Each percentage shows how far that price is from your sell price.',
  },
  hold: {
    headline: 'Wait',
    verb: 'wait',
    sub: 'The AI suggests waiting until the chart is clearer.',
    entry: 'Price to watch',
    entryHint: 'The trade only makes sense from here',
    stop: 'Emergency exit',
    stopHint: 'Below this price the idea no longer holds',
    target: 'Target',
    firstTargetHint: 'Where the price could get to first',
    nextTargetHint: 'If it keeps going, it could reach here',
    ladderNote: 'Each percentage shows how far that price is from the price to watch.',
  },
};

export type LadderRung = {
  kind: 'target' | 'entry' | 'stop';
  label: string;
  hint: string;
  price: number;
  delta: string | null;
};

/* The Strategy as a price ladder, highest price on top, so a buy reads
   targets-entry-exit and a sell reads the other way up. */
export function buildLadder(strategy: Strategy): LadderRung[] {
  const copy = directionCopy[strategy.direction];
  const numbered = strategy.take_profit.length > 1;
  /* Targets are numbered from the entry outwards whatever order the AI gave
     them in, so "target 1" is always the one the price reaches first. */
  const targets = [...strategy.take_profit].sort(
    (a, b) => Math.abs(a - strategy.entry) - Math.abs(b - strategy.entry),
  );

  const rungs: LadderRung[] = [
    ...targets.map((price, index) => ({
      kind: 'target' as const,
      label: numbered ? `${copy.target} ${index + 1}` : copy.target,
      hint: index === 0 ? copy.firstTargetHint : copy.nextTargetHint,
      price,
      delta: formatDelta(price, strategy.entry),
    })),
    {
      kind: 'entry' as const,
      label: copy.entry,
      hint: copy.entryHint,
      price: strategy.entry,
      delta: null,
    },
    {
      kind: 'stop' as const,
      label: copy.stop,
      hint: copy.stopHint,
      price: strategy.stop_loss,
      delta: formatDelta(strategy.stop_loss, strategy.entry),
    },
  ];

  return rungs.sort((a, b) => b.price - a.price);
}

export const DISCLAIMER =
  'This is for learning, not financial advice. Inflectra never trades for you.';
