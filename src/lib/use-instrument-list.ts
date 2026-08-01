import { useCallback, useRef, useState } from 'react';

import { INSTRUMENT_LIST_UNAVAILABLE } from '@/lib/instrument-copy';
import { fetchInstruments, type Instrument } from '@/lib/instruments';
import { userFacingMessage } from '@/lib/user-facing-error';

export type InstrumentListState = {
  /* Null while the list is still on its way. */
  instruments: Instrument[] | null;
  error: string | null;
  load: () => void;
};

/* The Instruments on offer, loaded on demand rather than once: what Firi sells
   can change while the app is running, so each asking asks again. */
export function useInstrumentList(fetchList = fetchInstruments): InstrumentListState {
  const [instruments, setInstruments] = useState<Instrument[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadGeneration = useRef(0);

  const loadList = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setError(null);
    setInstruments(null);
    try {
      const listed = await fetchList();
      /* A load left behind by an earlier asking must not stomp this one. */
      if (generation === loadGeneration.current) setInstruments(listed);
    } catch (caught) {
      if (generation === loadGeneration.current) {
        setError(userFacingMessage(caught, INSTRUMENT_LIST_UNAVAILABLE));
      }
    }
  }, [fetchList]);

  /* What a button press calls: the load runs on, nobody waits for it. */
  const load = useCallback(() => void loadList(), [loadList]);

  return { instruments, error, load };
}
