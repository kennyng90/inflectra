/* Test rig for analyze-chart: a fake Supabase environment (env vars + RS256
   JWTs) and a fetch stub, so the real handler code path runs untouched. */
import { exportJWK, generateKeyPair, SignJWT } from 'jose';

export const SUPABASE_URL = 'http://localhost:54321';
export const ANTHROPIC_URL = 'https://api.anthropic.com';
const KEY_ID = 'test-key';

let signJwtRS256: (userId: string) => Promise<string>;

export async function setupSupabaseEnv(): Promise<void> {
  const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });
  const publicJwk = { ...(await exportJWK(publicKey)), kid: KEY_ID, alg: 'RS256', use: 'sig' };

  Deno.env.set('SUPABASE_URL', SUPABASE_URL);
  Deno.env.set('SUPABASE_JWKS', JSON.stringify({ keys: [publicJwk] }));
  Deno.env.set('SUPABASE_PUBLISHABLE_KEYS', JSON.stringify({ default: 'sb_publishable_test' }));
  Deno.env.set('SUPABASE_SECRET_KEYS', JSON.stringify({ default: 'sb_secret_test' }));
  Deno.env.set('ANTHROPIC_API_KEY', 'sk-ant-test');

  signJwtRS256 = (userId: string) =>
    new SignJWT({ role: 'authenticated', email: 'trader@example.com' })
      .setProtectedHeader({ alg: 'RS256', kid: KEY_ID })
      .setSubject(userId)
      .setAudience('authenticated')
      .setIssuer(`${SUPABASE_URL}/auth/v1`)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);
}

export function signUserJwt(userId: string): Promise<string> {
  return signJwtRS256(userId);
}

export type FetchCall = { url: URL; method: string; body: string | null };

export type StubOptions = {
  /** Response the fake Anthropic Messages API returns. */
  anthropic: () => Response;
  /** Set false to make the Chart download fail the way a missing object does. */
  chartExists?: boolean;
  /** Set false to make the History insert fail. */
  insertSucceeds?: boolean;
};

export type FetchStub = {
  calls: FetchCall[];
  restore: () => void;
  callsTo: (pathPrefix: string) => FetchCall[];
};

const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);

export function stubFetch(options: StubOptions): FetchStub {
  const { anthropic, chartExists = true, insertSucceeds = true } = options;
  const original = globalThis.fetch;
  const calls: FetchCall[] = [];

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const body = request.method === 'GET' ? null : await request.text();
    calls.push({ url, method: request.method, body });

    if (url.origin === ANTHROPIC_URL && url.pathname === '/v1/messages') {
      return anthropic();
    }

    if (url.pathname.startsWith('/storage/v1/object/')) {
      if (!chartExists) {
        return Response.json(
          { statusCode: '404', error: 'not_found', message: 'Object not found' },
          { status: 400 },
        );
      }
      return new Response(PNG_BYTES, { headers: { 'content-type': 'image/png' } });
    }

    if (url.pathname === '/rest/v1/analyses') {
      if (!insertSucceeds) {
        return Response.json(
          { code: '42501', message: 'new row violates row-level security policy' },
          { status: 403 },
        );
      }
      return new Response(null, { status: 201 });
    }

    throw new Error(`Unexpected fetch to ${request.url}`);
  };

  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
    callsTo: (pathPrefix: string) => calls.filter((call) => call.url.pathname.startsWith(pathPrefix)),
  };
}

/** A Messages API response whose text block carries `payload` verbatim. */
export function anthropicResponse(payload: unknown, stopReason = 'end_turn'): Response {
  return Response.json({
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-opus-5',
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    stop_reason: stopReason,
    usage: { input_tokens: 1200, output_tokens: 400 },
  });
}
