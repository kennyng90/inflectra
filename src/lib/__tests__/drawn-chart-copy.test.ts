import { DISCLAIMER } from '../analysis-copy';
import { TIME_RESOLUTIONS } from '../chart-origin';
import {
  DRAWING_FAILED,
  DRAWN_CHART_UNREADABLE,
  MARKET_DATA_UNREACHABLE,
  MARKET_DATA_UNREADABLE,
  MARKET_PRICE_NOTE,
  NOT_ENOUGH_MARKET_DATA,
  TIME_RESOLUTION_COPY,
  drawnChartSubtitle,
  drawnChartTitle,
} from '../drawn-chart-copy';

describe('TIME_RESOLUTION_COPY', () => {
  it('explains both Time resolutions without naming a candle interval', () => {
    for (const resolution of TIME_RESOLUTIONS) {
      const copy = TIME_RESOLUTION_COPY[resolution];
      expect(copy.label.length).toBeGreaterThan(0);
      expect(copy.detail).toMatch(/steps$/);
      expect(copy.step).toMatch(/steps$/);
      expect(`${copy.label} ${copy.detail} ${copy.step}`).not.toMatch(/\d+[hm]\b|interval|granular/i);
    }
  });

  it('says how far back each one reaches', () => {
    /* One day, because two is not a range the price data comes in. */
    expect(TIME_RESOLUTION_COPY.two_days.detail).toMatch(/one day/i);
    expect(TIME_RESOLUTION_COPY.thirty_days.detail).toMatch(/month/i);
  });
});

describe('drawnChartTitle', () => {
  it('names the Instrument and what its prices are in', () => {
    expect(drawnChartTitle('Bitcoin')).toBe('Bitcoin in kroner (NOK)');
  });
});

describe('drawnChartSubtitle', () => {
  /* The dates are what makes a saved Chart still say what it is: "thirty days"
     alone is only true on the day it was drawn. */
  it('says which days the Chart covers and how long each candle is', () => {
    expect(drawnChartSubtitle('2 Jul – 1 Aug 2026', 'thirty_days')).toBe(
      '2 Jul – 1 Aug 2026, in four-hour steps',
    );
    expect(drawnChartSubtitle('1 Aug 2026', 'two_days')).toBe(
      '1 Aug 2026, in half-hour steps',
    );
  });
});

describe('MARKET_PRICE_NOTE', () => {
  it("warns that the prices are the wider market, not the user's exchange", () => {
    expect(MARKET_PRICE_NOTE).toMatch(/wider market/i);
    expect(MARKET_PRICE_NOTE).toMatch(/exchange/i);
  });

  it('says nothing the disclaimer says, so it can never stand in for it', () => {
    expect(MARKET_PRICE_NOTE).not.toMatch(/advice|inflectra/i);
    expect(MARKET_PRICE_NOTE).not.toBe(DISCLAIMER);
  });

  it('names no index, no feed and no ticker', () => {
    expect(MARKET_PRICE_NOTE).not.toMatch(/index|aggregat|order book|spread|oracle/i);
  });
});

describe('the messages a failed drawing shows', () => {
  it('offers a way on and never blames the user for our image', () => {
    for (const message of [
      MARKET_DATA_UNREACHABLE,
      MARKET_DATA_UNREADABLE,
      NOT_ENOUGH_MARKET_DATA,
      DRAWING_FAILED,
      DRAWN_CHART_UNREADABLE,
    ]) {
      expect(message).toMatch(/try again/i);
      expect(message).not.toMatch(/your chart|your image|you picked/i);
    }
  });

  /* The AI failing to read our own drawing is our defect, so the message says
     we drew it - never that the picture was bad. */
  it('owns a drawing the AI could not read', () => {
    expect(DRAWN_CHART_UNREADABLE).toMatch(/^we couldn't draw/i);
  });
});
