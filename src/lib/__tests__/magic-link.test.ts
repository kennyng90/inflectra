import { authResultFromUrl, isValidEmail } from '../magic-link';

describe('authResultFromUrl', () => {
  it('extracts tokens from a web redirect fragment', () => {
    const url =
      'http://localhost:8081/#access_token=aaa&expires_in=3600&refresh_token=bbb&token_type=bearer&type=magiclink';
    expect(authResultFromUrl(url)).toEqual({
      type: 'tokens',
      accessToken: 'aaa',
      refreshToken: 'bbb',
    });
  });

  it('extracts tokens from a native scheme deep link', () => {
    const url = 'inflectra://#access_token=aaa&refresh_token=bbb';
    expect(authResultFromUrl(url)).toEqual({
      type: 'tokens',
      accessToken: 'aaa',
      refreshToken: 'bbb',
    });
  });

  it('extracts tokens from query params as a fallback', () => {
    const url = 'inflectra://?access_token=aaa&refresh_token=bbb';
    expect(authResultFromUrl(url)).toEqual({
      type: 'tokens',
      accessToken: 'aaa',
      refreshToken: 'bbb',
    });
  });

  it('reports a decoded error description for expired links', () => {
    const url =
      'http://localhost:8081/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';
    expect(authResultFromUrl(url)).toEqual({
      type: 'error',
      message: 'Email link is invalid or has expired',
    });
  });

  it('falls back to the error code when no description is present', () => {
    const url = 'http://localhost:8081/#error=access_denied&error_code=otp_expired';
    expect(authResultFromUrl(url)).toEqual({ type: 'error', message: 'otp_expired' });
  });

  it('returns null for URLs without auth params', () => {
    expect(authResultFromUrl('http://localhost:8081/')).toBeNull();
    expect(authResultFromUrl('inflectra://settings')).toBeNull();
  });

  it('returns null when the token pair is incomplete', () => {
    expect(authResultFromUrl('http://localhost:8081/#access_token=aaa')).toBeNull();
  });
});

describe('isValidEmail', () => {
  it.each(['kenny@example.com', 'a.b+tag@sub.domain.co'])('accepts %s', (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each(['', 'kenny', 'kenny@', '@example.com', 'a b@example.com', 'kenny@example'])(
    'rejects %s',
    (email) => {
      expect(isValidEmail(email)).toBe(false);
    },
  );
});
