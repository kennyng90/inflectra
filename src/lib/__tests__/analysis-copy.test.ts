import type { Strategy } from '@/lib/analysis-contract';

import {
  buildLadder,
  directionCopy,
  formatDelta,
  formatPercent,
  formatPrice,
  trendCopy,
} from '../analysis-copy';

const strategy = (overrides: Partial<Strategy> = {}): Strategy => ({
  direction: 'long',
  entry: 62800,
  stop_loss: 59500,
  take_profit: [64500, 67000],
  confidence: 0.7,
  rationale: 'The shape points up.',
  ...overrides,
});

describe('formatPrice', () => {
  it('groups thousands', () => {
    expect(formatPrice(62800)).toBe('62,800');
  });

  it('keeps the precision of sub-cent prices', () => {
    expect(formatPrice(0.00004321)).toBe('0.00004321');
  });

  it('keeps decimals on ordinary prices', () => {
    expect(formatPrice(184.25)).toBe('184.25');
  });
});

describe('formatPercent', () => {
  it('rounds a confidence to whole percent', () => {
    expect(formatPercent(0.72)).toBe('72%');
    expect(formatPercent(1)).toBe('100%');
  });
});

describe('formatDelta', () => {
  it('signs a gain and a loss against the entry price', () => {
    expect(formatDelta(64500, 62800)).toBe('+2.7%');
    expect(formatDelta(59500, 62800)).toBe('-5.3%');
  });

  it('never shows a signed zero', () => {
    expect(formatDelta(62790, 62800)).toBe('0.0%');
  });

  it('has no baseline to compare against when the entry price is zero', () => {
    expect(formatDelta(120, 0)).toBeNull();
  });
});

describe('plain-language labels', () => {
  it('says Rising, Falling and Flat instead of the trading terms', () => {
    expect(trendCopy.bullish.label).toBe('Rising');
    expect(trendCopy.bearish.label).toBe('Falling');
    expect(trendCopy.sideways.label).toBe('Flat');
  });

  it('names the action for every direction', () => {
    expect(directionCopy.long.headline).toBe('Buy');
    expect(directionCopy.short.headline).toBe('Sell');
    expect(directionCopy.hold.headline).toBe('Wait');
  });

  it('carries a verb that completes "Why the AI says ..."', () => {
    expect(directionCopy.long.verb).toBe('buy');
    expect(directionCopy.short.verb).toBe('sell');
    expect(directionCopy.hold.verb).toBe('wait');
  });
});

describe('buildLadder', () => {
  it('runs from the highest price down to the lowest', () => {
    expect(buildLadder(strategy()).map((rung) => rung.price)).toEqual([67000, 64500, 62800, 59500]);
  });

  it('marks each rung so the ladder can colour it', () => {
    expect(buildLadder(strategy()).map((rung) => rung.kind)).toEqual([
      'target',
      'target',
      'entry',
      'stop',
    ]);
  });

  it('numbers the targets outwards from the entry price', () => {
    const labels = buildLadder(strategy()).map((rung) => rung.label);
    expect(labels).toEqual([
      'Sell target 2',
      'Sell target 1',
      'Buy at this price',
      'Emergency exit',
    ]);
  });

  it('numbers by distance even when the AI lists the furthest target first', () => {
    const rungs = buildLadder(strategy({ take_profit: [67000, 64500] }));
    expect(rungs.slice(0, 2).map((rung) => [rung.label, rung.price])).toEqual([
      ['Sell target 2', 67000],
      ['Sell target 1', 64500],
    ]);
  });

  it('drops the number when there is only one target', () => {
    const [target] = buildLadder(strategy({ take_profit: [64500] }));
    expect(target.label).toBe('Sell target');
  });

  it('tells the reader to take the first target first', () => {
    const [second, first] = buildLadder(strategy());
    expect(first.hint).toBe('Sell here first to lock in gains');
    expect(second.hint).toBe('If it keeps climbing, sell the rest here');
  });

  it('puts a short trade the other way up: emergency exit on top, buy-backs below', () => {
    const rungs = buildLadder(
      strategy({ direction: 'short', entry: 62800, stop_loss: 65000, take_profit: [60000, 58000] }),
    );
    expect(rungs.map((rung) => rung.kind)).toEqual(['stop', 'entry', 'target', 'target']);
    expect(rungs[0].label).toBe('Emergency exit');
    expect(rungs[2].label).toBe('Buy-back target 1');
  });

  it('still shows entry and emergency exit when the AI names no targets', () => {
    expect(buildLadder(strategy({ take_profit: [] })).map((rung) => rung.kind)).toEqual([
      'entry',
      'stop',
    ]);
  });

  it('compares every price against the entry, which has no delta of its own', () => {
    const rungs = buildLadder(strategy());
    expect(rungs.map((rung) => rung.delta)).toEqual(['+6.7%', '+2.7%', null, '-5.3%']);
  });
});
