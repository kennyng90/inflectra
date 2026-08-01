import { TIME_RESOLUTIONS } from '../chart-origin';
import {
  MARKET_DATA_UNREACHABLE,
  MARKET_DATA_UNREADABLE,
  NOT_ENOUGH_MARKET_DATA,
} from '../drawn-chart-copy';
import { DRAWING_HEIGHT, DRAWING_WIDTH, MIN_CANDLES, buildDrawnChart } from '../drawn-chart';
import type { FetchLike } from '../fetch-json';
import { INSTRUMENT_CATALOGUE } from '../instruments';
import { UserFacingError } from '../user-facing-error';

/* CoinGecko answers [openTimeMs, open, high, low, close]. */
type Ohlc = [number, number, number, number, number];

const HALF_HOUR = 30 * 60 * 1000;
const FOUR_HOURS = 8 * HALF_HOUR;
/* Local time, and early enough in the day that twelve hours of half-hour
   candles stay on it wherever the tests run. */
const FIRST_CANDLE = new Date(2026, 6, 20, 6).getTime();

/* A gentle zig-zag, so highs and lows land on known candles. */
function candles(count = MIN_CANDLES + 10, step = HALF_HOUR): Ohlc[] {
  return Array.from({ length: count }, (_, index) => {
    const open = 100 + (index % 5) * 2;
    const close = index % 2 === 0 ? open + 1 : open - 1;
    return [
      FIRST_CANDLE + index * step,
      open,
      Math.max(open, close) + 1,
      Math.min(open, close) - 1,
      close,
    ];
  });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* The day a timestamp falls on where the drawing is being made, since that is
   the clock the labels are written against. */
function dayOf(time: number): string {
  const at = new Date(time);
  return `${at.getDate()} ${MONTHS[at.getMonth()]}`;
}

function datedOf(time: number): string {
  return `${dayOf(time)} ${new Date(time).getFullYear()}`;
}

function stubFetch(body: unknown, ok = true): jest.MockedFunction<FetchLike> {
  return jest.fn(async (_url: string) => ({ ok, json: async () => body }));
}

/* Whatever the user picked: the assertions below are about the drawing, not
   about which Instrument is in it. */
const PICK = { instrument: 'BTC', timeResolution: 'thirty_days' } as const;

describe('buildDrawnChart', () => {
  it('asks CoinGecko for the picked Instrument, priced in NOK', async () => {
    const fetchImpl = stubFetch(candles());

    await buildDrawnChart({ instrument: 'BTC', timeResolution: 'two_days' }, fetchImpl);

    const url = fetchImpl.mock.calls[0][0];
    expect(url).toContain('/coins/bitcoin/ohlc');
    expect(url).toContain('vs_currency=nok');
  });

  /* Whatever Firi is selling today, the pick that comes back is drawable: the
     catalogue is the same one both sides read. */
  it('draws every Instrument the catalogue lists', async () => {
    for (const instrument of INSTRUMENT_CATALOGUE) {
      const fetchImpl = stubFetch(candles());

      const drawn = await buildDrawnChart(
        { instrument: instrument.symbol, timeResolution: 'thirty_days' },
        fetchImpl,
      );

      expect(fetchImpl.mock.calls[0][0]).toContain(`/coins/${instrument.coinGeckoId}/ohlc`);
      expect(drawn.title).toContain(instrument.name);
      expect(drawn.origin.instrument).toBe(instrument.symbol);
    }
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

    const drawn = await buildDrawnChart(PICK, stubFetch(rows));

    expect(drawn.origin).toEqual({ instrument: 'BTC', time_resolution: 'thirty_days' });
    expect(drawn.candles).toHaveLength(rows.length);
    expect(drawn.size).toEqual({ width: DRAWING_WIDTH, height: DRAWING_HEIGHT });
    expect(drawn.priceTicks.length).toBeGreaterThan(1);
    expect(drawn.timeTicks.length).toBeGreaterThan(1);
    expect(drawn.title).toContain('Bitcoin');
    expect(drawn.subtitle).toMatch(/four-hour/);
  });

  it('reads a rising candle as rising and a falling one as falling', async () => {
    const drawn = await buildDrawnChart(PICK, stubFetch(candles()));

    expect(drawn.candles.map((candle) => candle.rising).slice(0, 4)).toEqual([
      true,
      false,
      true,
      false,
    ]);
  });

  it('keeps every coordinate inside the drawing area', async () => {
    const drawn = await buildDrawnChart(PICK, stubFetch(candles()));
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

    const drawn = await buildDrawnChart(PICK, stubFetch(rows));
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
      FIRST_CANDLE + index * HALF_HOUR,
      100,
      100,
      100,
      100,
    ]);

    const drawn = await buildDrawnChart(PICK, stubFetch(flat));

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

    /* Norwegian numbers, and the unit said once at the top of the column so a
       level read off the middle of the axis is still a price in kroner. */
    expect(closeUp.priceTicks[0].label).toMatch(/^[\d ]+(,\d+)? kr$/);
    for (const tick of closeUp.priceTicks.slice(1)) expect(tick.label).toMatch(/^[\d ]+(,\d+)?$/);
    /* Half-hour steps are read as a time of day, a month as a date. */
    for (const tick of closeUp.timeTicks) expect(tick.label).toMatch(/^\d{2}:\d{2}$/);
    for (const tick of wide.timeTicks) expect(tick.label).toMatch(/^\d{1,2} [A-Z][a-z]{2}$/);
  });

  /* A stable Instrument's whole day can sit inside a few øre. Rounded to the
     precision a thousand-krone price wants, every tick reads the same and the
     axis stops being something an AI's levels can be checked against. */
  it('tells the price labels apart when the whole range sits inside an øre', async () => {
    const barelyMoving: Ohlc[] = Array.from({ length: MIN_CANDLES }, (_, index) => {
      const open = 10.1 + (index % 4) * 0.01;
      const close = open + 0.005;
      return [FIRST_CANDLE + index * HALF_HOUR, open, close + 0.002, open - 0.002, close];
    });

    const drawn = await buildDrawnChart(PICK, stubFetch(barelyMoving));
    const labels = drawn.priceTicks.map((tick) => tick.label);

    expect(new Set(labels).size).toBe(labels.length);
    /* And one precision down the whole column, not one per number. */
    const decimals = labels.map((label) => (label.split(',')[1] ?? '').replace(' kr', '').length);
    expect(new Set(decimals).size).toBe(1);
  });

  /* Someone opening this Chart in History next year has nothing but the image,
     so the image carries the days it covers - not "thirty days" from a day it
     no longer names. */
  it('writes the days the Chart covers onto it', async () => {
    const rows = candles(MIN_CANDLES + 10, FOUR_HOURS);

    const drawn = await buildDrawnChart(PICK, stubFetch(rows));

    expect(drawn.subtitle).toContain(dayOf(rows[0][0]));
    expect(drawn.subtitle).toContain(datedOf(rows[rows.length - 1][0]));
    expect(drawn.subtitle).toMatch(/four-hour steps$/);
  });

  it('says one day once when every candle is from that day', async () => {
    const rows = candles(MIN_CANDLES, HALF_HOUR);

    const drawn = await buildDrawnChart(
      { instrument: 'BTC', timeResolution: 'two_days' },
      stubFetch(rows),
    );

    expect(drawn.subtitle).toBe(`${datedOf(rows[0][0])}, in half-hour steps`);
  });

  it('fails when the price data cannot be reached', async () => {
    await expect(buildDrawnChart(PICK, stubFetch(candles(), false))).rejects.toThrow(
      MARKET_DATA_UNREACHABLE,
    );

    const offline = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as FetchLike;
    await expect(buildDrawnChart(PICK, offline)).rejects.toThrow(MARKET_DATA_UNREACHABLE);
  });

  it('fails on an answer it cannot read rather than drawing half a Chart', async () => {
    await expect(buildDrawnChart(PICK, stubFetch({ status: 'ok' }))).rejects.toThrow(
      MARKET_DATA_UNREADABLE,
    );
    await expect(buildDrawnChart(PICK, stubFetch([[1, 2, 3]]))).rejects.toThrow(
      MARKET_DATA_UNREADABLE,
    );
    await expect(
      buildDrawnChart(PICK, stubFetch(candles().concat([[1, 2, 3, 4, null]] as never))),
    ).rejects.toThrow(MARKET_DATA_UNREADABLE);
  });

  /* An error page answered with a 200 is not JSON at all. */
  it('fails on an answer that is not JSON', async () => {
    const html: FetchLike = async () => ({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    });

    await expect(buildDrawnChart(PICK, html)).rejects.toThrow(MARKET_DATA_UNREADABLE);
  });

  it('fails when there are too few candles to read anything from', async () => {
    await expect(buildDrawnChart(PICK, stubFetch(candles(MIN_CANDLES - 1)))).rejects.toThrow(
      NOT_ENOUGH_MARKET_DATA,
    );
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
