import { INSTRUMENT_LIST_UNAVAILABLE } from '../instrument-copy';
import { INSTRUMENT_CATALOGUE, fetchInstruments, instrumentFor } from '../instruments';
import { UserFacingError } from '../user-facing-error';
import { offlineFetch, stubFetch } from '@/test-support/stub-fetch';

/* Firi answers one row per market, named by the pair with no separator, and
   quotes several currencies. Measured 2026-08-01: eleven markets, nine of them
   NOK. */
const market = (id: string) => ({
  id,
  last: '1.00',
  high: '0',
  change: '0',
  low: '0',
  volume: '0',
});

const FIRI_MARKETS = [
  'ETHDKK',
  'XRPNOK',
  'BTCDKK',
  'DOTNOK',
  'USDCNOK',
  'LTCNOK',
  'BNBNOK',
  'ADANOK',
  'SOLNOK',
  'BTCNOK',
  'ETHNOK',
].map(market);

const symbolsOf = (instruments: { symbol: string }[]) => instruments.map((one) => one.symbol);

describe('fetchInstruments', () => {
  it('asks Firi which markets it runs', async () => {
    const fetchImpl = stubFetch(FIRI_MARKETS);

    await fetchInstruments(fetchImpl);

    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.firi.com/v2/markets');
  });

  it('lists what Firi sells for kroner and nothing quoted in another currency', async () => {
    const listed = await fetchInstruments(stubFetch(FIRI_MARKETS));

    expect(symbolsOf(listed).sort()).toEqual(
      ['ADA', 'BNB', 'BTC', 'DOT', 'ETH', 'LTC', 'SOL', 'USDC', 'XRP'].sort(),
    );
  });

  it('carries the catalogue onto every Instrument it lists', async () => {
    const listed = await fetchInstruments(stubFetch(FIRI_MARKETS));

    expect(listed.find((one) => one.symbol === 'BTC')).toEqual({
      symbol: 'BTC',
      name: 'Bitcoin',
      coinGeckoId: 'bitcoin',
      stable: false,
    });
    expect(listed.find((one) => one.symbol === 'USDC')?.stable).toBe(true);
  });

  /* Drawing the wrong thing under the right name is worse than not offering it,
     so a pair arrives with a release or not at all. */
  it('leaves out a kroner pair the catalogue has never heard of', async () => {
    const listed = await fetchInstruments(stubFetch([...FIRI_MARKETS, market('DOGENOK')]));

    expect(symbolsOf(listed)).not.toContain('DOGE');
    expect(symbolsOf(listed)).toContain('BTC');
  });

  it('shows them in the catalogue order however Firi orders its answer', async () => {
    const forwards = await fetchInstruments(stubFetch(FIRI_MARKETS));
    const backwards = await fetchInstruments(stubFetch([...FIRI_MARKETS].reverse()));

    expect(symbolsOf(backwards)).toEqual(symbolsOf(forwards));
    expect(symbolsOf(forwards)).toEqual(symbolsOf(INSTRUMENT_CATALOGUE));
  });

  it('fails when the list cannot be reached', async () => {
    await expect(fetchInstruments(stubFetch(FIRI_MARKETS, { ok: false }))).rejects.toThrow(
      INSTRUMENT_LIST_UNAVAILABLE,
    );

    await expect(fetchInstruments(offlineFetch())).rejects.toThrow(INSTRUMENT_LIST_UNAVAILABLE);
  });

  it('fails on an answer it cannot read rather than offering half a list', async () => {
    const malformed = [{ status: 'ok' }, [market('BTCNOK'), { pair: 'BTCNOK' }], [{ id: 7 }]];

    for (const body of malformed) {
      const error = await fetchInstruments(stubFetch(body)).catch((caught) => caught);
      expect(error).toBeInstanceOf(UserFacingError);
      expect(error.message).toBe(INSTRUMENT_LIST_UNAVAILABLE);
    }
  });

  /* An exchange that sells nothing we know is a broken answer, not an empty
     shop, and an empty picker explains neither. */
  it('fails when nothing in the answer is an Instrument', async () => {
    await expect(fetchInstruments(stubFetch([market('ETHDKK')]))).rejects.toThrow(
      INSTRUMENT_LIST_UNAVAILABLE,
    );
  });
});

describe('INSTRUMENT_CATALOGUE', () => {
  /* Pinned rather than derived: this map is the one thing no test can check
     against the price source, so it is checked against what was measured
     (2026-08-01, CoinGecko answered all nine in NOK). */
  it('maps every Instrument to the right price identifier', () => {
    const byId = Object.fromEntries(
      INSTRUMENT_CATALOGUE.map((one) => [one.symbol, one.coinGeckoId]),
    );

    expect(byId).toEqual({
      BTC: 'bitcoin',
      ETH: 'ethereum',
      XRP: 'ripple',
      SOL: 'solana',
      ADA: 'cardano',
      DOT: 'polkadot',
      LTC: 'litecoin',
      BNB: 'binancecoin',
      USDC: 'usd-coin',
    });
  });

  it('names every Instrument once', () => {
    const symbols = INSTRUMENT_CATALOGUE.map((one) => one.symbol);
    const ids = INSTRUMENT_CATALOGUE.map((one) => one.coinGeckoId);

    expect(new Set(symbols).size).toBe(symbols.length);
    expect(new Set(ids).size).toBe(ids.length);
    for (const one of INSTRUMENT_CATALOGUE) expect(one.name.length).toBeGreaterThan(0);
  });

  it('records which Instrument holds its price rather than guessing from one', () => {
    expect(INSTRUMENT_CATALOGUE.filter((one) => one.stable).map((one) => one.symbol)).toEqual([
      'USDC',
    ]);
  });
});

describe('instrumentFor', () => {
  it('finds a listed Instrument and admits it has never heard of another', () => {
    expect(instrumentFor('ETH')?.coinGeckoId).toBe('ethereum');
    expect(instrumentFor('DOGE')).toBeUndefined();
  });
});
