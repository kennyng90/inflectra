import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import {
  DIRECTIONS,
  TRENDS,
  analysisSchema,
  type Analysis,
  type Direction,
  type Trend,
} from '@/lib/analysis-contract';
import { supabase } from '@/lib/supabase';
import { PermanentError, SERVER_UNCONFIGURED, UserFacingError } from '@/lib/user-facing-error';

const BUCKET = 'charts';
const TABLE = 'analyses';
const LISTED_COLUMNS = 'id, asset_guess, storage_path, analysis, created_at';

/* Long enough to browse History without re-signing, short enough that a leaked
   URL goes stale quickly. Every visit to the tab signs fresh URLs. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export const HISTORY_LOAD_ERROR =
  "We couldn't load your history. Check your connection and try again.";

export const HISTORY_ENTRY_LOAD_ERROR =
  "We couldn't open this analysis. Check your connection and try again.";

export const HISTORY_ENTRY_MISSING = "It was deleted, so there's nothing left to show.";

/* The list reads a row loosely, so one the app can no longer parse in full
   still gets this far. */
export const HISTORY_ENTRY_UNREADABLE =
  "It was saved by an older version of the app, so we can't show it anymore.";

export const HISTORY_DELETE_ERROR =
  "We couldn't delete this analysis. Check your connection and try again.";

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

/* One saved Analysis, read back whole so it can be re-read in hindsight next to
   the Chart it was based on. */
export type SavedAnalysis = {
  id: string;
  storagePath: string;
  createdAt: string;
  analysis: Analysis;
  /* Null when the Chart couldn't be signed; the Analysis still opens. */
  chartUrl: string | null;
};

export async function fetchSavedAnalysis(
  id: string,
  client: SupabaseClient | null = supabase,
): Promise<SavedAnalysis> {
  if (!client) throw new UserFacingError(SERVER_UNCONFIGURED);

  const { data, error } = await client
    .from(TABLE)
    .select(LISTED_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new UserFacingError(HISTORY_ENTRY_LOAD_ERROR);
  if (!data) throw new PermanentError(HISTORY_ENTRY_MISSING);

  const row = data as HistoryRecord;
  const parsed = analysisSchema.safeParse(row.analysis);
  if (!parsed.success) throw new PermanentError(HISTORY_ENTRY_UNREADABLE);

  const signed = await client.storage
    .from(BUCKET)
    .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);

  return {
    id: row.id,
    storagePath: row.storage_path,
    createdAt: row.created_at,
    analysis: parsed.data,
    chartUrl: signed.data?.signedUrl ?? null,
  };
}

/* The Chart image goes first: removing it is idempotent, so a delete that only
   half-lands leaves the entry listed and a retry finishes the job. */
export async function deleteHistoryEntry(
  entry: { id: string; storagePath: string },
  client: SupabaseClient | null = supabase,
): Promise<void> {
  if (!client) throw new UserFacingError(SERVER_UNCONFIGURED);

  /* Removing nothing counts as done: that is what a retry of a half-finished
     delete looks like, and it must be able to go on and drop the row. */
  const { error: imageError } = await client.storage.from(BUCKET).remove([entry.storagePath]);
  if (imageError) throw new UserFacingError(HISTORY_DELETE_ERROR);

  const { error } = await client.from(TABLE).delete().eq('id', entry.id);
  if (error) throw new UserFacingError(HISTORY_DELETE_ERROR);
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
