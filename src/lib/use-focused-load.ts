import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

export type FocusedLoadState<Value, Failure> = {
  value: Value | null;
  error: Failure | null;
  refreshing: boolean;
  refresh: () => void;
  retry: () => void;
};

export function useFocusedLoad<Value, Failure>(
  fetchValue: () => Promise<Value>,
  mapError: (error: unknown) => Failure,
): FocusedLoadState<Value, Failure> {
  const [value, setValue] = useState<Value | null>(null);
  const [error, setError] = useState<Failure | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const requestGeneration = useRef(0);

  const load = useCallback(async () => {
    const generation = ++requestGeneration.current;
    try {
      const next = await fetchValue();
      if (generation !== requestGeneration.current) return;
      setValue(next);
      setError(null);
    } catch (caught) {
      if (generation !== requestGeneration.current) return;
      setError(mapError(caught));
    }
  }, [fetchValue, mapError]);

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

  return { value, error, refreshing, refresh, retry };
}
