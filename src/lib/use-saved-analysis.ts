import { useCallback } from 'react';

import { HISTORY_ENTRY_LOAD_ERROR, fetchSavedAnalysis, type SavedAnalysis } from '@/lib/history';
import { useFocusedLoad } from '@/lib/use-focused-load';
import { isPermanent, userFacingMessage } from '@/lib/user-facing-error';

export type LoadFailure = {
  message: string;
  /* False once trying again can only fail the same way. */
  retryable: boolean;
};

export type SavedAnalysisState = {
  /* Null until the first load lands. */
  saved: SavedAnalysis | null;
  error: LoadFailure | null;
  retry: () => void;
};

function mapSavedAnalysisError(error: unknown): LoadFailure {
  return {
    message: userFacingMessage(error, HISTORY_ENTRY_LOAD_ERROR),
    retryable: !isPermanent(error),
  };
}

export function useSavedAnalysis(id: string): SavedAnalysisState {
  const fetchAnalysis = useCallback(() => fetchSavedAnalysis(id), [id]);
  /* Focus reloads renew signed Chart URLs before they expire. */
  const { value: saved, error, retry } = useFocusedLoad(fetchAnalysis, mapSavedAnalysisError);

  return { saved, error, retry };
}
