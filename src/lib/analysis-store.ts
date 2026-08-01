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
import { chartOriginSchema, type ChartOrigin } from '@/lib/chart-origin';
import {
  HISTORY_DELETE_ERROR,
  HISTORY_ENTRY_LOAD_ERROR,
  HISTORY_ENTRY_MISSING,
  HISTORY_ENTRY_UNREADABLE,
  HISTORY_LOAD_ERROR,
} from '@/lib/history-copy';
import { supabase } from '@/lib/supabase';
import {
  PermanentError,
  SERVER_UNCONFIGURED,
  UserFacingError,
} from '@/lib/user-facing-error';

const CHART_BUCKET = 'charts';
const ANALYSIS_TABLE = 'analyses';
const LISTED_COLUMNS =
  'id, asset_guess, storage_path, analysis, created_at, instrument, time_resolution';
/* Each History visit signs fresh URLs. This keeps leaked URLs short-lived. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const CHART_CONTENT_TYPE = 'image/jpeg';

export type HistoryEntry = {
  id: string;
  /* The Instrument where the row has one - a fact - and otherwise the AI's
     guess at what the Chart showed. */
  label: string;
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
  /* Absent on a row saved before a Chart could say where it came from, null on
     one the user supplied. */
  instrument?: string | null;
  time_resolution?: string | null;
};

export type SavedAnalysis = {
  id: string;
  storagePath: string;
  createdAt: string;
  analysis: Analysis;
  /* Null when the Chart couldn't be signed; the Analysis still opens. */
  chartUrl: string | null;
  /* Null when the user supplied the Chart. */
  origin: ChartOrigin | null;
};

/* Only what a row shows, read loosely so an Analysis saved under an older
   contract still lists. */
const listedAnalysisSchema = z.object({
  trend: z.enum(TRENDS),
  strategy: z.object({ direction: z.enum(DIRECTIONS) }),
});

export type AnalysisStoreClient = Pick<SupabaseClient, 'from' | 'functions' | 'storage'>;

export function createAnalysisStore(client: AnalysisStoreClient | null = supabase) {
  if (!client) throw new UserFacingError(SERVER_UNCONFIGURED);

  const removeChart = (storagePath: string) =>
    client.storage.from(CHART_BUCKET).remove([storagePath]);

  return {
    createStoragePath(userId: string): string {
      const objectName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      return `${userId}/${objectName}`;
    },

    uploadChart(storagePath: string, bytes: Uint8Array) {
      return client.storage
        .from(CHART_BUCKET)
        .upload(storagePath, bytes, { contentType: CHART_CONTENT_TYPE });
    },

    removeChart,

    /* An origin is only sent for a Chart Inflectra drew: the function reads its
       absence as the user having supplied the image. */
    invokeAnalysis(storagePath: string, origin?: ChartOrigin) {
      return client.functions.invoke('analyze-chart', {
        body: { storage_path: storagePath, ...origin },
      });
    },

    listAnalyses() {
      return client
        .from(ANALYSIS_TABLE)
        .select(LISTED_COLUMNS)
        .order('created_at', { ascending: false });
    },

    getAnalysis(id: string) {
      return client.from(ANALYSIS_TABLE).select(LISTED_COLUMNS).eq('id', id).maybeSingle();
    },

    signCharts(storagePaths: string[]) {
      return client.storage
        .from(CHART_BUCKET)
        .createSignedUrls(storagePaths, SIGNED_URL_TTL_SECONDS);
    },

    signChart(storagePath: string) {
      return client.storage
        .from(CHART_BUCKET)
        .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
    },

    async deleteAnalysisPair(
      target: { id: string } | { storagePath: string },
    ): Promise<void> {
      if ('id' in target) {
        const { data, error } = await client
          .from(ANALYSIS_TABLE)
          .select('storage_path')
          .eq('id', target.id)
          .maybeSingle();
        if (error) throw error;
        if (!data) return;

        /* Chart first: a retry finds the Analysis row and can finish. */
        const { error: chartError } = await removeChart(data.storage_path);
        if (chartError) throw chartError;

        const { error: rowError } = await client
          .from(ANALYSIS_TABLE)
          .delete()
          .eq('id', target.id);
        if (rowError) throw rowError;
        return;
      }

      /* A canceled run has no caller left to retry, so attempt both halves. */
      await Promise.allSettled([
        removeChart(target.storagePath),
        client.from(ANALYSIS_TABLE).delete().eq('storage_path', target.storagePath),
      ]);
    },
  };
}

export type AnalysisStore = ReturnType<typeof createAnalysisStore>;

/* Read as loosely as the list itself: a row saved before these columns existed
   simply has no origin, which is what a Chart the user supplied has too. */
function toChartOrigin(row: HistoryRecord): ChartOrigin | null {
  const parsed = chartOriginSchema.safeParse({
    instrument: row.instrument,
    time_resolution: row.time_resolution,
  });
  return parsed.success ? parsed.data : null;
}

export function toHistoryEntry(row: HistoryRecord): HistoryEntry | null {
  const parsed = listedAnalysisSchema.safeParse(row.analysis);
  if (!parsed.success) return null;

  return {
    id: row.id,
    label: toChartOrigin(row)?.instrument ?? row.asset_guess,
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
  store: AnalysisStore,
  entries: HistoryEntry[],
): Promise<HistoryEntry[]> {
  if (entries.length === 0) return entries;

  const { data } = await store.signCharts(entries.map((entry) => entry.storagePath));
  if (!data) return entries;

  const signed = new Map(data.filter((item) => item.path).map((item) => [item.path, item.signedUrl]));
  return entries.map((entry) => ({
    ...entry,
    thumbnailUrl: signed.get(entry.storagePath) ?? null,
  }));
}

/* RLS scopes the rows to the signed-in user, so no filter is needed here. */
export async function fetchHistory(
  client?: AnalysisStoreClient | null,
): Promise<HistoryEntry[]> {
  const store = createAnalysisStore(client);

  const { data, error } = await store.listAnalyses();
  if (error || !data) throw new UserFacingError(HISTORY_LOAD_ERROR);

  const entries = (data as HistoryRecord[])
    .map(toHistoryEntry)
    .filter((entry): entry is HistoryEntry => entry !== null);

  return withThumbnails(store, entries);
}

/* One saved Analysis, read back whole so it can be re-read in hindsight next to
   the Chart it was based on. */
export async function fetchSavedAnalysis(
  id: string,
  client?: AnalysisStoreClient | null,
): Promise<SavedAnalysis> {
  const store = createAnalysisStore(client);

  const { data, error } = await store.getAnalysis(id);
  if (error) throw new UserFacingError(HISTORY_ENTRY_LOAD_ERROR);
  if (!data) throw new PermanentError(HISTORY_ENTRY_MISSING);

  const row = data as HistoryRecord;
  const parsed = analysisSchema.safeParse(row.analysis);
  if (!parsed.success) throw new PermanentError(HISTORY_ENTRY_UNREADABLE);

  const signed = await store.signChart(row.storage_path);

  return {
    id: row.id,
    storagePath: row.storage_path,
    createdAt: row.created_at,
    analysis: parsed.data,
    chartUrl: signed.data?.signedUrl ?? null,
    origin: toChartOrigin(row),
  };
}

export async function deleteHistoryEntry(
  id: string,
  client?: AnalysisStoreClient | null,
): Promise<void> {
  const store = createAnalysisStore(client);
  try {
    await store.deleteAnalysisPair({ id });
  } catch {
    throw new UserFacingError(HISTORY_DELETE_ERROR);
  }
}
