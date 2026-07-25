import { directionCopy, formatPercent, formatPrice, trendCopy } from '../analysis-copy';

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
});
