import {
  createAnalysisStore,
  deleteHistoryEntry,
  fetchHistory,
  fetchSavedAnalysis,
  toHistoryEntry,
  type AnalysisStoreClient,
  type HistoryRecord,
} from '../analysis-store';
import {
  HISTORY_DELETE_ERROR,
  HISTORY_ENTRY_LOAD_ERROR,
  HISTORY_ENTRY_MISSING,
  HISTORY_ENTRY_UNREADABLE,
  HISTORY_LOAD_ERROR,
} from '../history-copy';
import { isPermanent, userFacingMessage } from '../user-facing-error';

const analysis = {
  is_chart: true,
  asset_guess: 'BTC/USD 4h',
  summary: 'A summary.',
  trend: 'bullish',
  patterns: [],
  support_levels: [],
  resistance_levels: [],
  volatility: 'High',
  volume_read: 'Rising',
  sentiment: 'Greedy',
  strategy: {
    direction: 'long',
    entry: 100,
    stop_loss: 90,
    take_profit: [120],
    confidence: 0.7,
    rationale: 'Because.',
  },
};

/* A Chart the user supplied: the AI guessed at what it showed and nothing on the
   row says where it came from. */
const row = (overrides: Partial<HistoryRecord> = {}): HistoryRecord => ({
  id: 'row-1',
  asset_guess: 'BTC/USD 4h',
  storage_path: 'user-1/chart-1.jpg',
  created_at: '2026-07-25T09:00:00.000Z',
  analysis,
  instrument: null,
  time_resolution: null,
  ...overrides,
});

const drawnRow = (overrides: Partial<HistoryRecord> = {}): HistoryRecord =>
  row({ instrument: 'BTC', time_resolution: 'thirty_days', ...overrides });

type QueryResult = { data: unknown; error: unknown };
type SignResult = { data: { path: string | null; signedUrl: string }[] | null; error: unknown };

function fakeClient(query: QueryResult, sign: SignResult = { data: [], error: null }) {
  const order = jest.fn().mockResolvedValue(query);
  const select = jest.fn(() => ({ order }));
  const from = jest.fn(() => ({ select }));
  const createSignedUrls = jest.fn().mockResolvedValue(sign);
  const storageFrom = jest.fn(() => ({ createSignedUrls }));
  const client = { from, storage: { from: storageFrom } } as unknown as AnalysisStoreClient;
  return { client, from, select, order, storageFrom, createSignedUrls };
}

describe('toHistoryEntry', () => {
  it('keeps only what the list shows', () => {
    expect(toHistoryEntry(row())).toEqual({
      id: 'row-1',
      label: 'BTC/USD 4h',
      storagePath: 'user-1/chart-1.jpg',
      createdAt: '2026-07-25T09:00:00.000Z',
      trend: 'bullish',
      direction: 'long',
      thumbnailUrl: null,
    });
  });

  it('labels a drawn Analysis with the Instrument rather than the guess', () => {
    expect(toHistoryEntry(drawnRow())?.label).toBe('BTC');
  });

  it('lists a row saved before an origin could be recorded', () => {
    const older: HistoryRecord = {
      id: 'row-1',
      asset_guess: 'BTC/USD 4h',
      storage_path: 'user-1/chart-1.jpg',
      created_at: '2026-07-25T09:00:00.000Z',
      analysis,
    };

    expect(toHistoryEntry(older)?.label).toBe('BTC/USD 4h');
  });

  it('drops a row whose saved Analysis no longer reads', () => {
    expect(toHistoryEntry(row({ analysis: { trend: 'upwards' } }))).toBeNull();
    expect(toHistoryEntry(row({ analysis: null }))).toBeNull();
  });
});

describe('fetchHistory', () => {
  it('lists the Analyses newest-first with signed thumbnails', async () => {
    const rows = [
      row(),
      row({ id: 'row-2', storage_path: 'user-1/chart-2.jpg', created_at: '2026-07-24T09:00:00.000Z' }),
    ];
    const { client, from, select, order, storageFrom, createSignedUrls } = fakeClient(
      { data: rows, error: null },
      {
        data: [
          { path: 'user-1/chart-2.jpg', signedUrl: 'https://signed/2' },
          { path: 'user-1/chart-1.jpg', signedUrl: 'https://signed/1' },
        ],
        error: null,
      },
    );

    const entries = await fetchHistory(client);

    expect(from).toHaveBeenCalledTimes(1);
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(storageFrom).toHaveBeenCalledTimes(1);
    expect(createSignedUrls).toHaveBeenCalledWith(
      ['user-1/chart-1.jpg', 'user-1/chart-2.jpg'],
      expect.any(Number),
    );
    /* The Instrument is on the row, so the list has to ask for it. */
    expect(select).toHaveBeenCalledWith(expect.stringContaining('instrument'));
    expect(entries.map((entry) => entry.id)).toEqual(['row-1', 'row-2']);
    expect(entries.map((entry) => entry.thumbnailUrl)).toEqual([
      'https://signed/1',
      'https://signed/2',
    ]);
  });

  it('still lists the Analyses when signing the thumbnails fails', async () => {
    const { client } = fakeClient({ data: [row()], error: null }, { data: null, error: new Error('nope') });

    const entries = await fetchHistory(client);

    expect(entries).toHaveLength(1);
    expect(entries[0].thumbnailUrl).toBeNull();
  });

  it('skips rows whose saved Analysis no longer reads', async () => {
    const { client, createSignedUrls } = fakeClient({
      data: [row({ id: 'bad', analysis: { trend: 'upwards' } }), row()],
      error: null,
    });

    const entries = await fetchHistory(client);

    expect(entries.map((entry) => entry.id)).toEqual(['row-1']);
    expect(createSignedUrls).toHaveBeenCalledWith(['user-1/chart-1.jpg'], expect.any(Number));
  });

  it('asks for no signed URLs when there is nothing saved yet', async () => {
    const { client, createSignedUrls } = fakeClient({ data: [], error: null });

    await expect(fetchHistory(client)).resolves.toEqual([]);
    expect(createSignedUrls).not.toHaveBeenCalled();
  });

  it('fails with a message the user can act on', async () => {
    const { client } = fakeClient({ data: null, error: new Error('offline') });

    await expect(fetchHistory(client)).rejects.toThrow(HISTORY_LOAD_ERROR);
  });

  it('fails when the server connection is not set up', async () => {
    await expect(fetchHistory(null)).rejects.toThrow(/connection/i);
  });
});

type SingleResult = { data: unknown; error: unknown };

function fakeEntryClient(
  single: SingleResult,
  sign: { data: { signedUrl: string } | null; error: unknown } = {
    data: { signedUrl: 'https://signed/1' },
    error: null,
  },
) {
  const maybeSingle = jest.fn().mockResolvedValue(single);
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));
  const createSignedUrl = jest.fn().mockResolvedValue(sign);
  const storageFrom = jest.fn(() => ({ createSignedUrl }));
  const client = { from, storage: { from: storageFrom } } as unknown as AnalysisStoreClient;
  return { client, from, select, eq, maybeSingle, storageFrom, createSignedUrl };
}

describe('fetchSavedAnalysis', () => {
  it('reads back the whole Analysis with a signed Chart URL', async () => {
    const { client, from, eq, storageFrom, createSignedUrl } = fakeEntryClient({
      data: row(),
      error: null,
    });

    const saved = await fetchSavedAnalysis('row-1', client);

    expect(from).toHaveBeenCalledTimes(1);
    expect(eq).toHaveBeenCalledWith('id', 'row-1');
    expect(storageFrom).toHaveBeenCalledTimes(1);
    expect(createSignedUrl).toHaveBeenCalledWith('user-1/chart-1.jpg', expect.any(Number));
    expect(saved).toEqual({
      id: 'row-1',
      storagePath: 'user-1/chart-1.jpg',
      createdAt: '2026-07-25T09:00:00.000Z',
      analysis,
      chartUrl: 'https://signed/1',
      origin: null,
    });
  });

  it('reads back where a drawn Chart came from', async () => {
    const { client } = fakeEntryClient({ data: drawnRow(), error: null });

    await expect(fetchSavedAnalysis('row-1', client)).resolves.toMatchObject({
      origin: { instrument: 'BTC', time_resolution: 'thirty_days' },
    });
  });

  it('opens a row whose origin is half-written as one the user supplied', async () => {
    const { client } = fakeEntryClient({
      data: drawnRow({ time_resolution: null }),
      error: null,
    });

    await expect(fetchSavedAnalysis('row-1', client)).resolves.toMatchObject({ origin: null });
  });

  it('still opens the Analysis when signing the Chart fails', async () => {
    const { client } = fakeEntryClient(
      { data: row(), error: null },
      { data: null, error: new Error('nope') },
    );

    await expect(fetchSavedAnalysis('row-1', client)).resolves.toMatchObject({ chartUrl: null });
  });

  it('fails with a message the user can act on', async () => {
    const { client } = fakeEntryClient({ data: null, error: new Error('offline') });

    await expect(fetchSavedAnalysis('row-1', client)).rejects.toThrow(HISTORY_ENTRY_LOAD_ERROR);
  });

  it('says so plainly when the Analysis is already deleted', async () => {
    const { client } = fakeEntryClient({ data: null, error: null });

    await expect(fetchSavedAnalysis('row-1', client)).rejects.toThrow(HISTORY_ENTRY_MISSING);
  });

  it('says so plainly when the saved Analysis no longer reads', async () => {
    const { client } = fakeEntryClient({ data: row({ analysis: { trend: 'upwards' } }), error: null });

    await expect(fetchSavedAnalysis('row-1', client)).rejects.toThrow(HISTORY_ENTRY_UNREADABLE);
  });

  it('marks what cannot be retried, and only that', async () => {
    const gone = fakeEntryClient({ data: null, error: null });
    const unreadable = fakeEntryClient({ data: row({ analysis: null }), error: null });
    const offline = fakeEntryClient({ data: null, error: new Error('offline') });

    expect(isPermanent(await fetchSavedAnalysis('row-1', gone.client).catch((e) => e))).toBe(true);
    expect(isPermanent(await fetchSavedAnalysis('row-1', unreadable.client).catch((e) => e))).toBe(
      true,
    );
    expect(isPermanent(await fetchSavedAnalysis('row-1', offline.client).catch((e) => e))).toBe(
      false,
    );
  });

  it('fails when the server connection is not set up', async () => {
    await expect(fetchSavedAnalysis('row-1', null)).rejects.toThrow(/connection/i);
  });
});

function fakeDeleteClient(
  remove: { error: unknown } = { error: null },
  del: { error: unknown } = { error: null },
  lookup: { data: { storage_path: string } | null; error: unknown } = {
    data: { storage_path: 'user-1/chart-1.jpg' },
    error: null,
  },
) {
  const calls: string[] = [];
  const deleteEq = jest.fn(async () => {
    calls.push('row');
    return del;
  });
  const deleteRow = jest.fn(() => ({ eq: deleteEq }));
  const maybeSingle = jest.fn().mockResolvedValue(lookup);
  const selectEq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq: selectEq }));
  const from = jest.fn(() => ({ delete: deleteRow, select }));
  const removeObject = jest.fn(async () => {
    calls.push('chart');
    return remove;
  });
  const storageFrom = jest.fn(() => ({ remove: removeObject }));
  const client = { from, storage: { from: storageFrom } } as unknown as AnalysisStoreClient;
  return { client, calls, deleteEq, from, removeObject, selectEq, storageFrom };
}

const entry = { id: 'row-1', storagePath: 'user-1/chart-1.jpg' };

describe('deleteHistoryEntry', () => {
  it('takes the Chart out of storage before the row', async () => {
    const { client, calls, deleteEq, from, selectEq, storageFrom, removeObject } =
      fakeDeleteClient();

    await deleteHistoryEntry(entry.id, client);

    expect(storageFrom).toHaveBeenCalledTimes(1);
    expect(removeObject).toHaveBeenCalledWith(['user-1/chart-1.jpg']);
    expect(from).toHaveBeenCalledTimes(2);
    expect(selectEq).toHaveBeenCalledWith('id', 'row-1');
    expect(deleteEq).toHaveBeenCalledWith('id', 'row-1');
    /* Chart first: a retry after a half-done delete finds the row still listed. */
    expect(calls).toEqual(['chart', 'row']);
  });

  it('keeps the row when the Chart image will not go', async () => {
    const { client, deleteEq } = fakeDeleteClient({ error: new Error('offline') });

    await expect(deleteHistoryEntry(entry.id, client)).rejects.toThrow(HISTORY_DELETE_ERROR);
    expect(deleteEq).not.toHaveBeenCalled();
  });

  it('fails with a message the user can act on when the row will not go', async () => {
    const { client } = fakeDeleteClient({ error: null }, { error: new Error('offline') });

    await expect(deleteHistoryEntry(entry.id, client)).rejects.toThrow(HISTORY_DELETE_ERROR);
  });

  it('fails with a message the user can act on when the pair cannot be found', async () => {
    const { client, storageFrom } = fakeDeleteClient(
      { error: null },
      { error: null },
      { data: null, error: new Error('offline') },
    );

    await expect(deleteHistoryEntry(entry.id, client)).rejects.toThrow(HISTORY_DELETE_ERROR);
    expect(storageFrom).not.toHaveBeenCalled();
  });

  it('fails when the server connection is not set up', async () => {
    await expect(deleteHistoryEntry(entry.id, null)).rejects.toThrow(/connection/i);
  });
});

describe('invokeAnalysis', () => {
  function fakeInvokeClient() {
    const invoke = jest.fn().mockResolvedValue({ data: null, error: null });
    const client = { functions: { invoke } } as unknown as AnalysisStoreClient;
    return { client, invoke };
  }

  it('tells the function where a drawn Chart came from', () => {
    const { client, invoke } = fakeInvokeClient();

    createAnalysisStore(client).invokeAnalysis('user-1/chart-1.jpg', {
      instrument: 'BTC',
      time_resolution: 'two_days',
    });

    expect(invoke).toHaveBeenCalledWith('analyze-chart', {
      body: {
        storage_path: 'user-1/chart-1.jpg',
        instrument: 'BTC',
        time_resolution: 'two_days',
      },
    });
  });

  it('says nothing about an origin for a Chart the user supplied', () => {
    const { client, invoke } = fakeInvokeClient();

    createAnalysisStore(client).invokeAnalysis('user-1/chart-1.jpg');

    expect(invoke).toHaveBeenCalledWith('analyze-chart', {
      body: { storage_path: 'user-1/chart-1.jpg' },
    });
  });
});

describe('the message a failed load shows', () => {
  it('shows an expected failure as-is', async () => {
    const error = await fetchHistory(null).catch((caught) => caught);
    expect(userFacingMessage(error, HISTORY_LOAD_ERROR)).toMatch(/connection/i);
  });

  it('falls back for anything unexpected', () => {
    expect(userFacingMessage(new TypeError('boom'), HISTORY_LOAD_ERROR)).toBe(HISTORY_LOAD_ERROR);
  });
});
