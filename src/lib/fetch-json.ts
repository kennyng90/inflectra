/* The two things the app fetches for itself - which Instruments exist, and what
   they cost - fail the same two ways, and each says so in its own words. */

import { UserFacingError } from '@/lib/user-facing-error';

/* Only the part of `fetch` those modules use, so a test can stand in for it
   without building a whole Response. */
export type FetchLike = (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

type FailureCopy = {
  /* No answer arrived, or the one that did was not an answer at all. */
  unreachable: string;
  /* An answer arrived that is not JSON. */
  unreadable: string;
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
  if (!response.ok) throw new UserFacingError(failure.unreachable);

  return response.json().catch(() => {
    throw new UserFacingError(failure.unreadable);
  });
}
