/* Test-only, so it sits outside `src/lib` and never reaches the bundle. The
   three modules that fetch for themselves - the Instruments, the Market and one
   Chart's candles - all take a `FetchLike`, and all stand it up the same way. */
import type { FetchLike } from '@/lib/fetch-json';

/* A `fetch` answering one body. The status only says something where the caller
   tells a refusal to wait apart from being unable to reach anything at all. */
export function stubFetch(
  body: unknown,
  { ok = true, status = 200 } = {},
): jest.MockedFunction<FetchLike> {
  return jest.fn(async (_url: string) => ({ ok, status, json: async () => body }));
}

/* A `fetch` that never answers at all, the way a device with no network fails:
   it throws rather than handing back a response to look at. */
export function offlineFetch(): jest.MockedFunction<FetchLike> {
  return jest.fn(async (_url: string) => {
    throw new TypeError('Network request failed');
  });
}
