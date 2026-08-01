/* Which Instruments exist is Firi's answer: an Analysis of something the user
   cannot buy where they trade is a suggestion they cannot act on (ADR 0005).
   What each one *is* - where its prices come from, what to call it, whether its
   price is meant to move at all - is ours, and static. A kroner pair this
   catalogue has never heard of is left out rather than shown broken, because
   silently drawing the wrong thing is worse than a missing one. */

import { fetchJson, type FetchLike } from '@/lib/fetch-json';
import { INSTRUMENT_LIST_UNAVAILABLE } from '@/lib/instrument-copy';
import { UserFacingError } from '@/lib/user-facing-error';

export type Instrument = {
  /* Firi's base symbol, and what is written onto the Analysis row. */
  symbol: string;
  /* What the app calls it, in plain words. */
  name: string;
  /* Prices come from CoinGecko even though Firi picks the list, because Firi
     has no OHLC endpoint (ADR 0003). */
  coinGeckoId: string;
  /* A fact recorded on the Instrument, not a guess made from today's numbers:
     a real Instrument can have a flat day. */
  stable: boolean;
};

/* Everything Firi has quoted in NOK, in the order the app offers them. Adding a
   tenth is one line here and a release; see ADR 0005. */
export const INSTRUMENT_CATALOGUE: Instrument[] = [
  { symbol: 'BTC', name: 'Bitcoin', coinGeckoId: 'bitcoin', stable: false },
  { symbol: 'ETH', name: 'Ethereum', coinGeckoId: 'ethereum', stable: false },
  { symbol: 'XRP', name: 'XRP', coinGeckoId: 'ripple', stable: false },
  { symbol: 'SOL', name: 'Solana', coinGeckoId: 'solana', stable: false },
  { symbol: 'ADA', name: 'Cardano', coinGeckoId: 'cardano', stable: false },
  { symbol: 'DOT', name: 'Polkadot', coinGeckoId: 'polkadot', stable: false },
  { symbol: 'LTC', name: 'Litecoin', coinGeckoId: 'litecoin', stable: false },
  { symbol: 'BNB', name: 'BNB', coinGeckoId: 'binancecoin', stable: false },
  { symbol: 'USDC', name: 'USD Coin', coinGeckoId: 'usd-coin', stable: true },
];

export function instrumentFor(symbol: string): Instrument | undefined {
  return INSTRUMENT_CATALOGUE.find((candidate) => candidate.symbol === symbol);
}

const FIRI_MARKETS_ENDPOINT = 'https://api.firi.com/v2/markets';
/* Firi names a market by its pair with no separator, so BTCNOK is Bitcoin for
   kroner and ETHDKK is not ours. */
const KRONER_MARKET = /^([A-Z0-9]+)NOK$/;

function kronerSymbols(payload: unknown): string[] {
  if (!Array.isArray(payload)) throw new UserFacingError(INSTRUMENT_LIST_UNAVAILABLE);

  return payload.flatMap((market) => {
    const id = (market as { id?: unknown } | null)?.id;
    if (typeof id !== 'string') throw new UserFacingError(INSTRUMENT_LIST_UNAVAILABLE);
    const kroner = KRONER_MARKET.exec(id);
    return kroner ? [kroner[1]] : [];
  });
}

/* The Instruments on offer right now. `fetch` is the last argument, the way
   every other module here takes its client. */
export async function fetchInstruments(fetchImpl: FetchLike = fetch): Promise<Instrument[]> {
  /* One message either way: which of the two went wrong changes nothing the
     user can do about it. */
  const payload = await fetchJson(FIRI_MARKETS_ENDPOINT, fetchImpl, {
    unreachable: INSTRUMENT_LIST_UNAVAILABLE,
    unreadable: INSTRUMENT_LIST_UNAVAILABLE,
  });

  const sold = new Set(kronerSymbols(payload));
  /* Catalogue order, not Firi's: their answer arrives in no particular order
     and the list must not reshuffle between two openings of the same screen. */
  const listed = INSTRUMENT_CATALOGUE.filter((instrument) => sold.has(instrument.symbol));
  /* An answer holding no Instrument at all is a broken answer, not an empty
     exchange - and an empty list explains neither. */
  if (listed.length === 0) throw new UserFacingError(INSTRUMENT_LIST_UNAVAILABLE);
  return listed;
}
