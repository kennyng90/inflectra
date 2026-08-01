/* The things the app fetches for itself - which Instruments exist, what they
   cost, and the candles behind one Chart - fail the same few ways, and each
   says so in its own words. */

import { UserFacingError } from '@/lib/user-facing-error';

/* Only the part of `fetch` those modules use, so a test can stand in for it
   without building a whole Response. */
export type FetchLike = (
  url: string,
) => Promise<{ ok: boolean; status?: number; json: () => Promise<unknown> }>;

/* The one refusal worth telling apart from the rest: it says wait, and waiting
   is something the user can actually do. */
const TOO_MANY_REQUESTS = 429;

type FailureCopy = {
  /* No answer arrived, or the one that did was not an answer at all. */
  unreachable: string;
  /* An answer arrived that is not JSON. */
  unreadable: string;
  /* We asked too often. Left out where the caller has nothing to say about it
     that `unreachable` does not already say. */
  rateLimited?: string;
};

export async function fetchJson(
  url: string,
  fetchImpl: FetchLike,
  failure: FailureCopy,
): Promise<unknown> {
  let response: Awaited<ReturnType<FetchLike>>;
  try {
    response = await fetchImpl(url);
  } catch {
    throw new UserFacingError(failure.unreachable);
  }
  if (!response.ok) {
    const limited = response.status === TOO_MANY_REQUESTS && failure.rateLimited;
    throw new UserFacingError(limited || failure.unreachable);
  }

  return response.json().catch(() => {
    throw new UserFacingError(failure.unreadable);
  });
}
