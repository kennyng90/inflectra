/* A drawn Chart is analyzed exactly like a photographed one, except that it
   knows where it came from. This drives analyzeChart to check that the fact
   reaches the Edge Function, which is what writes it onto the row. */
import type { AnalysisStoreClient } from '../analysis-store';
import { analyzeChart } from '../chart-analysis';
import type { PickedChart } from '../analyze-flow-machine';

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

const analysis = {
  is_chart: true,
  asset_guess: 'BTC/NOK 30m',
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

const bodies: Record<string, unknown>[] = [];

const client = {
  storage: {
    from: () => ({
      upload: async () => ({ error: null }),
      remove: async () => ({ error: null }),
    }),
  },
  functions: {
    invoke: async (_name: string, options: { body: Record<string, unknown> }) => {
      bodies.push(options.body);
      return { data: analysis, error: null };
    },
  },
} as unknown as AnalysisStoreClient;

const supplied: PickedChart = { uri: 'file:///picked.jpg', width: 1200, height: 800 };
const drawn: PickedChart = {
  ...supplied,
  origin: { instrument: 'BTC', time_resolution: 'two_days' },
};

beforeEach(() => {
  bodies.length = 0;
});

describe('analyzeChart', () => {
  it('sends the Instrument and Time resolution a Chart was drawn at', async () => {
    await analyzeChart(drawn, 'user-1', {}, client);

    expect(bodies[0]).toMatchObject({ instrument: 'BTC', time_resolution: 'two_days' });
  });

  it('sends no origin for a Chart the user supplied', async () => {
    await analyzeChart(supplied, 'user-1', {}, client);

    expect(Object.keys(bodies[0])).toEqual(['storage_path']);
  });
});
