/* A cancel has to be provable end to end - the Edge Function saves the History
   row itself, so the only honest test drives analyzeChart against a fake
   Supabase client and checks what got undone. */
import { analyzeChart, CanceledError, isCanceled } from '../chart-analysis';
import type { AnalyzeStep } from '../analyzing-copy';

jest.mock('@/lib/supabase', () => ({
  /* A getter, so the fake below is built before it is ever read. */
  get supabase() {
    return mockClient;
  },
}));

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: {
    manipulate: () => ({
      resize: () => undefined,
      renderAsync: async () => ({ saveAsync: async () => ({ uri: 'file:///prepared.jpg' }) }),
    }),
  },
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('expo-file-system', () => ({
  File: class {
    bytes() {
      return Promise.resolve(new Uint8Array([1, 2, 3]));
    }
  },
}));

const removed: string[][] = [];
const deleted: { table: string; column: string; value: string }[] = [];
const uploaded: string[] = [];
let resolveInvoke: ((value: { data: unknown; error: unknown }) => void) | null = null;

const mockClient = {
  storage: {
    from: () => ({
      upload: async (path: string) => {
        uploaded.push(path);
        return { error: null };
      },
      remove: async (paths: string[]) => {
        removed.push(paths);
        return { error: null };
      },
    }),
  },
  functions: {
    invoke: () =>
      new Promise((resolve) => {
        resolveInvoke = resolve as typeof resolveInvoke;
      }),
  },
  from: (table: string) => ({
    delete: () => ({
      eq: (column: string, value: string) => {
        deleted.push({ table, column, value });
        return Promise.resolve({ error: null });
      },
    }),
  }),
};

const chart = { uri: 'file:///picked.jpg', width: 1200, height: 800 };

const analysis = {
  is_chart: true,
  asset_guess: 'BTC/USD 4h',
  summary: 'Price is climbing.',
  trend: 'bullish',
  patterns: [],
  support_levels: [1],
  resistance_levels: [2],
  volatility: 'calm',
  volume_read: 'steady',
  sentiment: 'hopeful',
  strategy: {
    direction: 'long',
    entry: 1,
    stop_loss: 0.5,
    take_profit: [2],
    confidence: 0.6,
    rationale: 'It keeps bouncing off the same price.',
  },
};

/* Lets every already-queued promise callback run. */
const settle = async () => {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
};

beforeEach(() => {
  removed.length = 0;
  deleted.length = 0;
  uploaded.length = 0;
  resolveInvoke = null;
});

describe('analyzeChart cancellation', () => {
  it('reports each step so the wait can show staged progress', async () => {
    const steps: AnalyzeStep[] = [];
    const run = analyzeChart(chart, 'user-1', { onStep: (step) => steps.push(step) });
    await settle();
    resolveInvoke!({ data: analysis, error: null });
    await run;

    expect(steps).toEqual(['preparing', 'uploading', 'reading']);
  });

  it('stops waiting as soon as the user cancels', async () => {
    const controller = new AbortController();
    const run = analyzeChart(chart, 'user-1', { signal: controller.signal });
    await settle();

    controller.abort();
    await expect(run).rejects.toBeInstanceOf(CanceledError);
  });

  it('undoes the saved Analysis when the cancelled run finishes anyway', async () => {
    const controller = new AbortController();
    const run = analyzeChart(chart, 'user-1', { signal: controller.signal });
    await settle();
    controller.abort();
    await expect(run).rejects.toThrow();

    /* The Edge Function keeps going after the user walks away. */
    resolveInvoke!({ data: analysis, error: null });
    await settle();

    expect(deleted).toEqual([{ table: 'analyses', column: 'storage_path', value: uploaded[0] }]);
    expect(removed).toEqual([[uploaded[0]]]);
  });

  it('cancels before uploading when the user is quick', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      analyzeChart(chart, 'user-1', { signal: controller.signal }),
    ).rejects.toBeInstanceOf(CanceledError);
    expect(uploaded).toEqual([]);
  });
});

describe('isCanceled', () => {
  it('recognises a cancelled run', () => {
    expect(isCanceled(new CanceledError())).toBe(true);
  });

  it('leaves real failures alone', () => {
    expect(isCanceled(new Error('Failed to fetch'))).toBe(false);
  });
});
