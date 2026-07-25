import { assertEquals, assertExists } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { type Analysis, analysisResultSchema } from '../../_shared/analysis-contract.ts';
import {
  anthropicResponse,
  setupSupabaseEnv,
  signUserJwt,
  stubFetch,
  type StubOptions,
} from '../utils/supabase-env.ts';

await setupSupabaseEnv();
const handler = (await import('../../analyze-chart/index.ts')).default;

const USER_ID = '11111111-2222-3333-4444-555555555555';
const STORAGE_PATH = `${USER_ID}/chart.png`;

const VALID_ANALYSIS: Analysis = {
  is_chart: true,
  asset_guess: 'BTC/USD 4h',
  summary: 'The price has been climbing for three days and is pressing against a ceiling.',
  trend: 'bullish',
  patterns: [{ name: 'ascending triangle', confidence: 0.8 }],
  support_levels: [61200, 59800],
  resistance_levels: [64500],
  volatility: 'Price swings are moderate.',
  volume_read: 'Trading activity rises on up days.',
  sentiment: 'Buyers are in control for now.',
  strategy: {
    direction: 'long',
    entry: 62800,
    stop_loss: 59500,
    take_profit: [64500, 67000],
    confidence: 0.7,
    rationale: 'Buyers keep stepping in at the same price, so a push higher is likely.',
  },
};

async function callFunction(
  options: StubOptions & { token?: string | null; body?: unknown },
): Promise<{ response: Response; stub: ReturnType<typeof stubFetch> }> {
  const { token, body, ...stubOptions } = options;
  const stub = stubFetch(stubOptions);
  try {
    const headers: HeadersInit = { 'content-type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await handler.fetch(
      new Request('http://localhost:54321/functions/v1/analyze-chart', {
        method: 'POST',
        headers,
        body: JSON.stringify(body ?? { storage_path: STORAGE_PATH }),
      }),
    );
    return { response, stub };
  } finally {
    stub.restore();
  }
}

function unexpectedAnthropicCall(): Response {
  throw new Error('Anthropic must not be called');
}

describe('analyze-chart', () => {
  it('returns a schema-valid Analysis and saves exactly one History row', async () => {
    const token = await signUserJwt(USER_ID);
    const { response, stub } = await callFunction({
      token,
      anthropic: () => anthropicResponse(VALID_ANALYSIS),
    });

    assertEquals(response.status, 200);
    const result = analysisResultSchema.parse(await response.json());
    assertEquals(result, VALID_ANALYSIS);

    const inserts = stub.callsTo('/rest/v1/analyses');
    assertEquals(inserts.length, 1);
    assertEquals(inserts[0].method, 'POST');
    const row = JSON.parse(inserts[0].body!);
    assertEquals(row.user_id, USER_ID);
    assertEquals(row.storage_path, STORAGE_PATH);
    assertEquals(row.asset_guess, 'BTC/USD 4h');
    assertEquals(row.analysis, VALID_ANALYSIS);
  });

  it('returns the Rejection and saves nothing when the image is not a Chart', async () => {
    const token = await signUserJwt(USER_ID);
    const rejection = { is_chart: false, reason: 'This looks like a photo of a cat, not a chart.' };
    const { response, stub } = await callFunction({
      token,
      anthropic: () => anthropicResponse(rejection),
    });

    assertEquals(response.status, 200);
    assertEquals(await response.json(), rejection);
    assertEquals(stub.callsTo('/rest/v1/analyses').length, 0);
  });

  it('errors and saves nothing when the AI returns JSON that breaks the contract', async () => {
    const token = await signUserJwt(USER_ID);
    const { response, stub } = await callFunction({
      token,
      anthropic: () => anthropicResponse({ is_chart: true, asset_guess: 'BTC/USD 4h' }),
    });

    assertEquals(response.status, 502);
    const body = await response.json();
    assertEquals(body.error.code, 'ai_invalid_response');
    assertExists(body.error.message);
    assertEquals(stub.callsTo('/rest/v1/analyses').length, 0);
  });

  it('errors and saves nothing when the AI answer is cut off', async () => {
    const token = await signUserJwt(USER_ID);
    const { response, stub } = await callFunction({
      token,
      anthropic: () => anthropicResponse(VALID_ANALYSIS, 'max_tokens'),
    });

    assertEquals(response.status, 502);
    assertEquals((await response.json()).error.code, 'ai_invalid_response');
    assertEquals(stub.callsTo('/rest/v1/analyses').length, 0);
  });

  it('errors and saves nothing when the AI declines the request', async () => {
    const token = await signUserJwt(USER_ID);
    const { response, stub } = await callFunction({
      token,
      anthropic: () => anthropicResponse(VALID_ANALYSIS, 'refusal'),
    });

    assertEquals(response.status, 502);
    assertEquals((await response.json()).error.code, 'ai_unavailable');
    assertEquals(stub.callsTo('/rest/v1/analyses').length, 0);
  });

  it('rejects an unauthenticated request with 401 before calling the AI', async () => {
    const { response, stub } = await callFunction({ token: null, anthropic: unexpectedAnthropicCall });

    assertEquals(response.status, 401);
    assertEquals(stub.calls.length, 0);
  });

  it('errors when the Chart is missing from storage', async () => {
    const token = await signUserJwt(USER_ID);
    const { response, stub } = await callFunction({
      token,
      chartExists: false,
      anthropic: unexpectedAnthropicCall,
    });

    assertEquals(response.status, 404);
    assertEquals((await response.json()).error.code, 'chart_not_found');
    assertEquals(stub.callsTo('/rest/v1/analyses').length, 0);
  });

  it('errors when the request has no storage path', async () => {
    const token = await signUserJwt(USER_ID);
    const { response, stub } = await callFunction({
      token,
      body: {},
      anthropic: unexpectedAnthropicCall,
    });

    assertEquals(response.status, 400);
    assertEquals((await response.json()).error.code, 'invalid_request');
    assertEquals(stub.calls.length, 0);
  });

  it('errors when the History row cannot be saved', async () => {
    const token = await signUserJwt(USER_ID);
    const { response } = await callFunction({
      token,
      insertSucceeds: false,
      anthropic: () => anthropicResponse(VALID_ANALYSIS),
    });

    assertEquals(response.status, 500);
    assertEquals((await response.json()).error.code, 'save_failed');
  });
});
