import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { fetchHistory, historyErrorMessage, type HistoryEntry } from '@/lib/history';

export type History = {
  /* Null until the first load lands. */
  entries: HistoryEntry[] | null;
  error: string | null;
  refreshing: boolean;
  refresh: () => void;
  retry: () => void;
};

export function useHistory(): History {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const request = useRef(0);

  const load = useCallback(async () => {
    const id = ++request.current;
    try {
      const next = await fetchHistory();
      if (id !== request.current) return;
      setEntries(next);
      setError(null);
    } catch (caught) {
      /* A newer load owns the state now. */
      if (id !== request.current) return;
      setError(historyErrorMessage(caught));
    }
  }, []);

  /* Re-read on every visit to the tab, so an Analysis saved from Analyze is
     already listed on arrival - and its thumbnail URL is freshly signed. */
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const retry = useCallback(() => {
    setError(null);
    void load();
  }, [load]);

  return { entries, error, refreshing, refresh, retry };
}
