import type { SupabaseClient } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { SERVER_UNCONFIGURED, UserFacingError } from '@/lib/user-facing-error';

const CHART_BUCKET = 'charts';
const ANALYSIS_TABLE = 'analyses';
const LISTED_COLUMNS = 'id, asset_guess, storage_path, analysis, created_at';
/* Each History visit signs fresh URLs. This keeps leaked URLs short-lived. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const CHART_CONTENT_TYPE = 'image/jpeg';

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

    invokeAnalysis(storagePath: string) {
      return client.functions.invoke('analyze-chart', {
        body: { storage_path: storagePath },
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
