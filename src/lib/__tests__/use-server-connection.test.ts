import { checkServerConnection } from '../use-server-connection';

const url = 'https://example.supabase.co';
const anonKey = 'anon-key';

describe('checkServerConnection', () => {
  it('reports connected when the health endpoint responds ok', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: true });
    await expect(checkServerConnection(url, anonKey, fetchFn)).resolves.toBe('connected');
    expect(fetchFn).toHaveBeenCalledWith(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
    });
  });

  it('reports offline when the health endpoint errors', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: false });
    await expect(checkServerConnection(url, anonKey, fetchFn)).resolves.toBe('offline');
  });

  it('reports offline when the request throws', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error('network down'));
    await expect(checkServerConnection(url, anonKey, fetchFn)).resolves.toBe('offline');
  });
});
