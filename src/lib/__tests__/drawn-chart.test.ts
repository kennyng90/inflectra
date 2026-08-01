import { TIME_RESOLUTIONS } from '../chart-origin';
import {
  DEFAULT_DRAWN_CHART_PICK,
  DRAWING_HEIGHT,
  DRAWING_WIDTH,
  MIN_CANDLES,
  buildDrawnChart,
  type FetchLike,
} from '../drawn-chart';
import {
  MARKET_DATA_UNREACHABLE,
  MARKET_DATA_UNREADABLE,
  NOT_ENOUGH_MARKET_DATA,
} from '../drawn-chart-copy';
import { UserFacingError } from '../user-facing-error';

/* CoinGecko answers [openTimeMs, open, high, low, close]. */
type Ohlc = [number, number, number, number, number];

const HALF_HOUR = 30 * 60 * 1000;

/* A gentle zig-zag, so highs and lows land on known candles. */
function candles(count = MIN_CANDLES + 10): Ohlc[] {
  return Array.from({ length: count }, (_, index) => {
    const open = 100 + (index % 5) * 2;
    const close = index % 2 === 0 ? open + 1 : open - 1;
    return [
      Date.UTC(2026, 6, 20) + index * HALF_HOUR,
      open,
      Math.max(open, close) + 1,
      Math.min(open, close) - 1,
      close,
    ];
  });
}

function stubFetch(body: unknown, ok = true): jest.MockedFunction<FetchLike> {
  return jest.fn(async (_url: string) => ({ ok, json: async () => body }));
}

describe('buildDrawnChart', () => {
  it('asks CoinGecko for the picked Instrument, priced in NOK', async () => {
    const fetchImpl = stubFetch(candles());

    await buildDrawnChart({ instrument: 'BTC', timeResolution: 'two_days' }, fetchImpl);

    const url = fetchImpl.mock.calls[0][0];
    expect(url).toContain('/coins/bitcoin/ohlc');
    expect(url).toContain('vs_currency=nok');
  });

  /* Only a listed range is answered at all, so each resolution asks for the one
     that yields the step it is named for. */
  it('asks for the range each Time resolution is drawn at', async () => {
    const asked = await Promise.all(
      TIME_RESOLUTIONS.map(async (timeResolution) => {
        const fetchImpl = stubFetch(candles());
        await buildDrawnChart({ instrument: 'ETH', timeResolution }, fetchImpl);
        return fetchImpl.mock.calls[0][0];
      }),
    );

    expect(asked[0]).toContain('/coins/ethereum/ohlc');
    expect(asked).toEqual([expect.stringContaining('days=1'), expect.stringContaining('days=30')]);
  });

  it('turns a well-formed answer into candles and axis ticks', async () => {
    const rows = candles();

    const drawn = await buildDrawnChart(DEFAULT_DRAWN_CHART_PICK, stubFetch(rows));

    expect(drawn.origin).toEqual({ instrument: 'BTC', time_resolution: 'thirty_days' });
    expect(drawn.candles).toHaveLength(rows.length);
    expect(drawn.size).toEqual({ width: DRAWING_WIDTH, height: DRAWING_HEIGHT });
    expect(drawn.priceTicks.length).toBeGreaterThan(1);
    expect(drawn.timeTicks.length).toBeGreaterThan(1);
    expect(drawn.title).toContain('Bitcoin');
    expect(drawn.subtitle).toMatch(/four-hour/);
  });

  it('reads a rising candle as rising and a falling one as falling', async () => {
    const drawn = await buildDrawnChart(DEFAULT_DRAWN_CHART_PICK, stubFetch(candles()));

    expect(drawn.candles.map((candle) => candle.rising).slice(0, 4)).toEqual([
      true,
      false,
      true,
      false,
    ]);
  });

  it('keeps every coordinate inside the drawing area', async () => {
    const drawn = await buildDrawnChart(DEFAULT_DRAWN_CHART_PICK, stubFetch(candles()));
    const { plot } = drawn;
    const right = plot.x + plot.width;
    const bottom = plot.y + plot.height;

    for (const candle of drawn.candles) {
      expect(candle.x - candle.width / 2).toBeGreaterThanOrEqual(plot.x);
      expect(candle.x + candle.width / 2).toBeLessThanOrEqual(right);
      expect(candle.wickTop).toBeGreaterThanOrEqual(plot.y);
      expect(candle.wickBottom).toBeLessThanOrEqual(bottom);
      expect(candle.bodyTop).toBeGreaterThanOrEqual(plot.y);
      expect(candle.bodyTop + candle.bodyHeight).toBeLessThanOrEqual(bottom);
    }
    for (const tick of drawn.priceTicks) {
      expect(tick.y).toBeGreaterThanOrEqual(plot.y);
      expect(tick.y).toBeLessThanOrEqual(bottom);
    }
    for (const tick of drawn.timeTicks) {
      expect(tick.x).toBeGreaterThanOrEqual(plot.x);
      expect(tick.x).toBeLessThanOrEqual(right);
    }
  });

  it('scales the prices so the whole candle range is drawn', async () => {
    const rows = candles();
    const highest = Math.max(...rows.map((row) => row[2]));
    const lowest = Math.min(...rows.map((row) => row[3]));

    const drawn = await buildDrawnChart(DEFAULT_DRAWN_CHART_PICK, stubFetch(rows));
    const bottom = drawn.plot.y + drawn.plot.height;

    const tops = rows.map((row, index) => (row[2] === highest ? drawn.candles[index].wickTop : null));
    const bottoms = rows.map((row, index) =>
      row[3] === lowest ? drawn.candles[index].wickBottom : null,
    );

    expect(tops).toContain(drawn.plot.y);
    expect(bottoms).toContain(bottom);
    /* The labelled prices span the same range the candles do. */
    expect(drawn.priceTicks[0].price).toBeCloseTo(highest);
    expect(drawn.priceTicks[drawn.priceTicks.length - 1].price).toBeCloseTo(lowest);
  });

  it('draws a flat market without dividing by nothing', async () => {
    const flat: Ohlc[] = Array.from({ length: MIN_CANDLES }, (_, index) => [
      Date.UTC(2026, 6, 20) + index * HALF_HOUR,
      100,
      100,
      100,
      100,
    ]);

    const drawn = await buildDrawnChart(DEFAULT_DRAWN_CHART_PICK, stubFetch(flat));

    for (const candle of drawn.candles) {
      expect(Number.isFinite(candle.wickTop)).toBe(true);
      expect(candle.wickTop).toBeGreaterThanOrEqual(drawn.plot.y);
      expect(candle.wickBottom).toBeLessThanOrEqual(drawn.plot.y + drawn.plot.height);
    }
  });

  it('labels the prices in kroner and the times in the step it was drawn at', async () => {
    const closeUp = await buildDrawnChart(
      { instrument: 'BTC', timeResolution: 'two_days' },
      stubFetch(candles()),
    );
    const wide = await buildDrawnChart(
      { instrument: 'BTC', timeResolution: 'thirty_days' },
      stubFetch(candles()),
    );

    for (const tick of closeUp.priceTicks) expect(tick.label).toMatch(/^[\d ]+(,\d+)?$/);
    /* Half-hour steps are read as a time of day, a month as a date. */
    for (const tick of closeUp.timeTicks) expect(tick.label).toMatch(/^\d{2}:\d{2}$/);
    for (const tick of wide.timeTicks) expect(tick.label).toMatch(/^\d{1,2} [A-Z][a-z]{2}$/);
  });

  it('fails when the price data cannot be reached', async () => {
    await expect(
      buildDrawnChart(DEFAULT_DRAWN_CHART_PICK, stubFetch(candles(), false)),
    ).rejects.toThrow(MARKET_DATA_UNREACHABLE);

    const offline = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as FetchLike;
    await expect(buildDrawnChart(DEFAULT_DRAWN_CHART_PICK, offline)).rejects.toThrow(
      MARKET_DATA_UNREACHABLE,
    );
  });

  it('fails on an answer it cannot read rather than drawing half a Chart', async () => {
    await expect(buildDrawnChart(DEFAULT_DRAWN_CHART_PICK, stubFetch({ status: 'ok' }))).rejects.toThrow(
      MARKET_DATA_UNREADABLE,
    );
    await expect(
      buildDrawnChart(DEFAULT_DRAWN_CHART_PICK, stubFetch([[1, 2, 3]])),
    ).rejects.toThrow(MARKET_DATA_UNREADABLE);
    await expect(
      buildDrawnChart(DEFAULT_DRAWN_CHART_PICK, stubFetch(candles().concat([[1, 2, 3, 4, null]] as never))),
    ).rejects.toThrow(MARKET_DATA_UNREADABLE);
  });

  it('fails when there are too few candles to read anything from', async () => {
    await expect(
      buildDrawnChart(DEFAULT_DRAWN_CHART_PICK, stubFetch(candles(MIN_CANDLES - 1))),
    ).rejects.toThrow(NOT_ENOUGH_MARKET_DATA);
  });

  /* The list is the only way to ask for an Instrument, so one off it is our own
     mistake and must not reach the user dressed as a failure they can retry. */
  it('fails on an Instrument that is not on the list without asking CoinGecko', async () => {
    const fetchImpl = stubFetch(candles());

    const error = await buildDrawnChart(
      { instrument: 'DOGE', timeResolution: 'two_days' },
      fetchImpl,
    ).catch((caught) => caught);

    expect(error).not.toBeInstanceOf(UserFacingError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
