import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { HISTORY_ENTRY_LOAD_ERROR, fetchSavedAnalysis, type SavedAnalysis } from '@/lib/history';
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

export function useSavedAnalysis(id: string): SavedAnalysisState {
  const [saved, setSaved] = useState<SavedAnalysis | null>(null);
  const [error, setError] = useState<LoadFailure | null>(null);
  const request = useRef(0);

  const load = useCallback(async () => {
    const attempt = ++request.current;
    try {
      const next = await fetchSavedAnalysis(id);
      /* A newer load owns the state now. */
      if (attempt !== request.current) return;
      setSaved(next);
      setError(null);
    } catch (caught) {
      if (attempt !== request.current) return;
      setError({
        message: userFacingMessage(caught, HISTORY_ENTRY_LOAD_ERROR),
        retryable: !isPermanent(caught),
      });
    }
  }, [id]);

  /* Re-read on every visit, like the History tab: a Chart URL signed an hour
     ago has gone stale by the time the user comes back to it. */
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const retry = useCallback(() => {
    setError(null);
    void load();
  }, [load]);

  return { saved, error, retry };
}
