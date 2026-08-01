import { fetchInstruments } from '@/lib/instruments';
import { fetchMarket, type MarketQuote } from '@/lib/market';
import { PRICES_UNAVAILABLE } from '@/lib/market-copy';
import { useFocusedLoad } from '@/lib/use-focused-load';
import { userFacingMessage } from '@/lib/user-facing-error';

export type Market = {
  /* Null until the first load lands. */
  quotes: MarketQuote[] | null;
  error: string | null;
  refreshing: boolean;
  refresh: () => void;
  retry: () => void;
};

/* Two answers, in order: Firi says which Instruments exist, and only then can
   the price source be asked what those cost (ADR 0005). Each failure carries
   its own words, so which of the two went wrong is what the user reads. */
async function loadMarket(): Promise<MarketQuote[]> {
  return fetchMarket(await fetchInstruments());
}

function mapMarketError(error: unknown): string {
  return userFacingMessage(error, PRICES_UNAVAILABLE);
}

export function useMarket(): Market {
  /* Focus reloads: a price on screen from an hour ago is the wrong price. */
  const { value: quotes, error, refreshing, refresh, retry } = useFocusedLoad(
    loadMarket,
    mapMarketError,
  );

  return { quotes, error, refreshing, refresh, retry };
}
