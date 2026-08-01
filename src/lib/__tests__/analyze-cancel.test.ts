/* The Edge Function saves the History row itself, so the only honest test of a
   cancel drives analyzeChart against a fake client and checks what got undone. */
import { analyzeChart, CanceledError, isAnalysisCanceled } from '../chart-analysis';
import type { AnalyzeStep } from '../analyzing-copy';
import type { AnalysisStoreClient } from '../analysis-store';

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
const deleted: { column: string; value: string }[] = [];
const uploaded: string[] = [];
let resolveInvoke: ((value: { data: unknown; error: unknown }) => void) | null = null;
/* Lets a test hold the upload open and cancel mid-flight. */
let holdUpload: () => Promise<void> = () => Promise.resolve();

const mockClient = {
  storage: {
    from: () => ({
      upload: async (path: string) => {
        await holdUpload();
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
  from: () => ({
    delete: () => ({
      eq: (column: string, value: string) => {
        deleted.push({ column, value });
        return Promise.resolve({ error: null });
      },
    }),
  }),
};
const client = mockClient as unknown as AnalysisStoreClient;

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

/* Drains the microtask queue, however many awaits deep the run currently is. */
const settle = () => new Promise<void>((resolve) => setImmediate(() => resolve()));

beforeEach(() => {
  removed.length = 0;
  deleted.length = 0;
  uploaded.length = 0;
  resolveInvoke = null;
  holdUpload = () => Promise.resolve();
});

describe('analyzeChart cancellation', () => {
  it('reports each step so the wait can show staged progress', async () => {
    const steps: AnalyzeStep[] = [];
    const run = analyzeChart(chart, 'user-1', { onStep: (step) => steps.push(step) }, client);
    await settle();
    resolveInvoke!({ data: analysis, error: null });
    await run;

    expect(steps).toEqual(['preparing', 'uploading', 'reading']);
  });

  it('stops waiting as soon as the user cancels', async () => {
    const controller = new AbortController();
    const run = analyzeChart(chart, 'user-1', { signal: controller.signal }, client);
    await settle();

    controller.abort();
    await expect(run).rejects.toBeInstanceOf(CanceledError);
  });

  it('undoes the saved Analysis when the canceled run finishes anyway', async () => {
    const controller = new AbortController();
    const run = analyzeChart(chart, 'user-1', { signal: controller.signal }, client);
    await settle();
    controller.abort();
    await expect(run).rejects.toThrow();

    /* The Edge Function keeps going after the user walks away. */
    resolveInvoke!({ data: analysis, error: null });
    await settle();

    expect(deleted).toEqual([{ column: 'storage_path', value: uploaded[0] }]);
    expect(removed).toEqual([[uploaded[0]]]);
  });

  it('stops waiting on an upload it cannot call off, then drops what landed', async () => {
    let finishUpload: (() => void) | null = null;
    holdUpload = () => new Promise<void>((resolve) => { finishUpload = resolve; });

    const controller = new AbortController();
    const run = analyzeChart(chart, 'user-1', { signal: controller.signal }, client);
    await settle();

    controller.abort();
    await expect(run).rejects.toBeInstanceOf(CanceledError);
    /* Control came back while the upload was still open. */
    expect(uploaded).toEqual([]);

    finishUpload!();
    await settle();

    /* The AI was never asked, so only the Chart needs undoing. */
    expect(resolveInvoke).toBeNull();
    expect(removed).toEqual([[uploaded[0]]]);
    expect(deleted).toEqual([]);
  });

  it('cancels before uploading when the user is quick', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      analyzeChart(chart, 'user-1', { signal: controller.signal }, client),
    ).rejects.toBeInstanceOf(CanceledError);
    expect(uploaded).toEqual([]);
  });
});

describe('isAnalysisCanceled', () => {
  it('recognises a canceled run', () => {
    expect(isAnalysisCanceled(new CanceledError())).toBe(true);
  });

  it('leaves real failures alone', () => {
    expect(isAnalysisCanceled(new Error('Failed to fetch'))).toBe(false);
  });
});
