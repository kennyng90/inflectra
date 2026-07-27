import { analyzeChart, GENERIC_ANALYZE_ERROR } from '../chart-analysis';
import { userFacingMessage } from '../user-facing-error';

jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return mockClient;
  },
}));

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: {
    manipulate: () => ({
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

const serverMessage = 'The chart could not be read. Pick another chart and try again.';
let uploadError: unknown = null;
const mockClient = {
  storage: {
    from: () => ({
      upload: async () => ({ error: uploadError }),
      remove: async () => ({ error: null }),
    }),
  },
  functions: {
    invoke: async () => ({
      data: null,
      error: {
        context: {
          json: async () => ({ error: { code: 'ai_invalid_response', message: serverMessage } }),
        },
      },
    }),
  },
};

describe('analyzeChart errors', () => {
  beforeEach(() => {
    uploadError = null;
  });

  it('keeps the Edge Function message when the analyze flow reads it', async () => {
    let thrown: unknown;
    try {
      await analyzeChart({ uri: 'file:///picked.jpg', width: 1200, height: 800 }, 'user-1');
    } catch (error) {
      thrown = error;
    }

    expect(userFacingMessage(thrown, GENERIC_ANALYZE_ERROR)).toBe(serverMessage);
    expect(userFacingMessage(new Error('unexpected'), GENERIC_ANALYZE_ERROR)).toBe(
      GENERIC_ANALYZE_ERROR,
    );
  });

  it('keeps the upload failure copy', async () => {
    uploadError = new Error('network down');
    let thrown: unknown;
    try {
      await analyzeChart({ uri: 'file:///picked.jpg', width: 1200, height: 800 }, 'user-1');
    } catch (error) {
      thrown = error;
    }

    expect(userFacingMessage(thrown, GENERIC_ANALYZE_ERROR)).toBe(
      "We couldn't upload your chart. Check your connection and try again.",
    );
  });
});
