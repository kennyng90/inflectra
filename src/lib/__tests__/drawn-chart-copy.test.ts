import { TIME_RESOLUTIONS } from '../chart-origin';
import {
  DRAWING_FAILED,
  MARKET_DATA_UNREACHABLE,
  MARKET_DATA_UNREADABLE,
  NOT_ENOUGH_MARKET_DATA,
  TIME_RESOLUTION_COPY,
  drawnChartTitle,
} from '../drawn-chart-copy';

describe('TIME_RESOLUTION_COPY', () => {
  it('explains both Time resolutions without naming a candle interval', () => {
    for (const resolution of TIME_RESOLUTIONS) {
      const copy = TIME_RESOLUTION_COPY[resolution];
      expect(copy.label.length).toBeGreaterThan(0);
      expect(copy.detail).toMatch(/steps$/);
      expect(copy.onChart).toMatch(/steps$/);
      expect(`${copy.label} ${copy.detail} ${copy.onChart}`).not.toMatch(/\d+[hm]\b|interval|granular/i);
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

describe('the messages a failed drawing shows', () => {
  it('offers a way on and never blames the user for our image', () => {
    for (const message of [
      MARKET_DATA_UNREACHABLE,
      MARKET_DATA_UNREADABLE,
      NOT_ENOUGH_MARKET_DATA,
      DRAWING_FAILED,
    ]) {
      expect(message).toMatch(/try again/i);
      expect(message).not.toMatch(/your chart|your image|you picked/i);
    }
  });
});
