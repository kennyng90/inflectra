import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { DIRECTIONS, TRENDS, type Direction, type Trend } from '@/lib/analysis-contract';
import { supabase } from '@/lib/supabase';
import { SERVER_UNCONFIGURED, UserFacingError } from '@/lib/user-facing-error';

const BUCKET = 'charts';
const TABLE = 'analyses';
const LISTED_COLUMNS = 'id, asset_guess, storage_path, analysis, created_at';

/* Long enough to browse History without re-signing, short enough that a leaked
   URL goes stale quickly. Every visit to the tab signs fresh URLs. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export const HISTORY_LOAD_ERROR =
  "We couldn't load your history. Check your connection and try again.";

export type HistoryEntry = {
  id: string;
  assetGuess: string;
  storagePath: string;
  createdAt: string;
  trend: Trend;
  direction: Direction;
  thumbnailUrl: string | null;
};

export type HistoryRecord = {
  id: string;
  asset_guess: string;
  storage_path: string;
  created_at: string;
  analysis: unknown;
};

/* Only what a row shows, read loosely so an Analysis saved under an older
   contract still lists. */
const listedAnalysisSchema = z.object({
  trend: z.enum(TRENDS),
  strategy: z.object({ direction: z.enum(DIRECTIONS) }),
});

export function toHistoryEntry(row: HistoryRecord): HistoryEntry | null {
  const parsed = listedAnalysisSchema.safeParse(row.analysis);
  if (!parsed.success) return null;

  return {
    id: row.id,
    assetGuess: row.asset_guess,
    storagePath: row.storage_path,
    createdAt: row.created_at,
    trend: parsed.data.trend,
    direction: parsed.data.strategy.direction,
    thumbnailUrl: null,
  };
}

/* The Charts stay private: each thumbnail is fetched through a short-lived
   signed URL rather than a public one. */
async function withThumbnails(
  client: SupabaseClient,
  entries: HistoryEntry[],
): Promise<HistoryEntry[]> {
  if (entries.length === 0) return entries;

  const { data } = await client.storage
    .from(BUCKET)
    .createSignedUrls(
      entries.map((entry) => entry.storagePath),
      SIGNED_URL_TTL_SECONDS,
    );
  if (!data) return entries;

  const signed = new Map(data.filter((item) => item.path).map((item) => [item.path, item.signedUrl]));
  return entries.map((entry) => ({
    ...entry,
    thumbnailUrl: signed.get(entry.storagePath) ?? null,
  }));
}

/* RLS scopes the rows to the signed-in user, so no filter is needed here. */
export async function fetchHistory(
  client: SupabaseClient | null = supabase,
): Promise<HistoryEntry[]> {
  if (!client) throw new UserFacingError(SERVER_UNCONFIGURED);

  const { data, error } = await client
    .from(TABLE)
    .select(LISTED_COLUMNS)
    .order('created_at', { ascending: false });
  if (error || !data) throw new UserFacingError(HISTORY_LOAD_ERROR);

  const entries = (data as HistoryRecord[])
    .map(toHistoryEntry)
    .filter((entry): entry is HistoryEntry => entry !== null);

  return withThumbnails(client, entries);
}

const monthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const monthDayYear = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function daysApart(from: Date, to: Date): number {
  const startOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((startOf(to).getTime() - startOf(from).getTime()) / millisecondsPerDay);
}

export function formatHistoryDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const days = daysApart(date, now);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return date.getFullYear() === now.getFullYear() ? monthDay.format(date) : monthDayYear.format(date);
}
