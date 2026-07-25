import { GENERIC_ANALYZE_ERROR, MAX_CHART_EDGE, resizeTarget, serverErrorMessage } from '../chart-analysis';

describe('resizeTarget', () => {
  it('caps the longest edge of a landscape image', () => {
    expect(resizeTarget(4000, 3000)).toEqual({ width: MAX_CHART_EDGE });
  });

  it('caps the longest edge of a portrait image', () => {
    expect(resizeTarget(1500, 6000)).toEqual({ height: MAX_CHART_EDGE });
  });

  it('leaves an image that already fits alone', () => {
    expect(resizeTarget(1200, 800)).toBeNull();
    expect(resizeTarget(MAX_CHART_EDGE, MAX_CHART_EDGE)).toBeNull();
  });

  it('leaves an image with unknown dimensions alone', () => {
    expect(resizeTarget(0, 0)).toBeNull();
    expect(resizeTarget(Number.NaN, Number.NaN)).toBeNull();
  });
});

describe('serverErrorMessage', () => {
  const response = (body: unknown) =>
    ({ context: { json: () => Promise.resolve(body) } }) as unknown as Error;

  it('surfaces the message the server sent', async () => {
    await expect(
      serverErrorMessage(response({ error: { code: 'chart_not_found', message: 'Pick it again.' } })),
    ).resolves.toBe('Pick it again.');
  });

  it('falls back when the server sends something else', async () => {
    await expect(serverErrorMessage(response({ whatever: true }))).resolves.toBe(GENERIC_ANALYZE_ERROR);
  });

  it('falls back when the error carries no response body', async () => {
    await expect(serverErrorMessage(new Error('Failed to fetch'))).resolves.toBe(GENERIC_ANALYZE_ERROR);
  });
});
