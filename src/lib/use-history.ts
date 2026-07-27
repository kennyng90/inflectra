import { fetchHistory, type HistoryEntry } from '@/lib/analysis-store';
import { HISTORY_LOAD_ERROR } from '@/lib/history-copy';
import { useFocusedLoad } from '@/lib/use-focused-load';
import { userFacingMessage } from '@/lib/user-facing-error';

export type History = {
  /* Null until the first load lands. */
  entries: HistoryEntry[] | null;
  error: string | null;
  refreshing: boolean;
  refresh: () => void;
  retry: () => void;
};

function mapHistoryError(error: unknown): string {
  return userFacingMessage(error, HISTORY_LOAD_ERROR);
}

export function useHistory(): History {
  /* Focus reloads list new Analyses and renew signed thumbnail URLs. */
  const { value: entries, error, refreshing, refresh, retry } = useFocusedLoad(
    fetchHistory,
    mapHistoryError,
  );

  return { entries, error, refreshing, refresh, retry };
}
