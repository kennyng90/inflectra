import type { SupabaseClient } from '@supabase/supabase-js';

import {
  HISTORY_LOAD_ERROR,
  fetchHistory,
  formatHistoryDate,
  toHistoryEntry,
  type HistoryRecord,
} from '../history';
import { userFacingMessage } from '../user-facing-error';

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

const row = (overrides: Partial<HistoryRecord> = {}): HistoryRecord => ({
  id: 'row-1',
  asset_guess: 'BTC/USD 4h',
  storage_path: 'user-1/chart-1.jpg',
  created_at: '2026-07-25T09:00:00.000Z',
  analysis,
  ...overrides,
});

type QueryResult = { data: unknown; error: unknown };
type SignResult = { data: { path: string | null; signedUrl: string }[] | null; error: unknown };

function fakeClient(query: QueryResult, sign: SignResult = { data: [], error: null }) {
  const order = jest.fn().mockResolvedValue(query);
  const select = jest.fn(() => ({ order }));
  const from = jest.fn(() => ({ select }));
  const createSignedUrls = jest.fn().mockResolvedValue(sign);
  const storageFrom = jest.fn(() => ({ createSignedUrls }));
  const client = { from, storage: { from: storageFrom } } as unknown as SupabaseClient;
  return { client, from, select, order, storageFrom, createSignedUrls };
}

describe('toHistoryEntry', () => {
  it('keeps only what the list shows', () => {
    expect(toHistoryEntry(row())).toEqual({
      id: 'row-1',
      assetGuess: 'BTC/USD 4h',
      storagePath: 'user-1/chart-1.jpg',
      createdAt: '2026-07-25T09:00:00.000Z',
      trend: 'bullish',
      direction: 'long',
      thumbnailUrl: null,
    });
  });

  it('drops a row whose saved Analysis no longer reads', () => {
    expect(toHistoryEntry(row({ analysis: { trend: 'upwards' } }))).toBeNull();
    expect(toHistoryEntry(row({ analysis: null }))).toBeNull();
  });
});

describe('formatHistoryDate', () => {
  /* Built from local parts: the label follows the user's calendar days, so a
     fixed UTC instant would say something different per timezone. */
  const at = (year: number, month: number, day: number, hour = 9) =>
    new Date(year, month - 1, day, hour).toISOString();
  const now = new Date(2026, 6, 25, 12);

  it('names the last two days instead of dating them', () => {
    expect(formatHistoryDate(at(2026, 7, 25, 1), now)).toBe('Today');
    expect(formatHistoryDate(at(2026, 7, 24, 23), now)).toBe('Yesterday');
  });

  it('drops the year within the current year', () => {
    expect(formatHistoryDate(at(2026, 3, 4), now)).toBe('Mar 4');
  });

  it('keeps the year for older Analyses', () => {
    expect(formatHistoryDate(at(2025, 12, 31), now)).toBe('Dec 31, 2025');
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

    expect(from).toHaveBeenCalledWith('analyses');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(storageFrom).toHaveBeenCalledWith('charts');
    expect(createSignedUrls).toHaveBeenCalledWith(
      ['user-1/chart-1.jpg', 'user-1/chart-2.jpg'],
      expect.any(Number),
    );
    expect(select).toHaveBeenCalled();
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

describe('the message a failed load shows', () => {
  it('shows an expected failure as-is', async () => {
    const error = await fetchHistory(null).catch((caught) => caught);
    expect(userFacingMessage(error, HISTORY_LOAD_ERROR)).toMatch(/connection/i);
  });

  it('falls back for anything unexpected', () => {
    expect(userFacingMessage(new TypeError('boom'), HISTORY_LOAD_ERROR)).toBe(HISTORY_LOAD_ERROR);
  });
});
