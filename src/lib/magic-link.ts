export type MagicLinkResult =
  | { type: 'tokens'; accessToken: string; refreshToken: string }
  | { type: 'error'; message: string };

function decode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

function paramsFrom(part: string | undefined): Record<string, string> {
  if (!part) return {};
  const params: Record<string, string> = {};
  for (const pair of part.split('&')) {
    const [key, ...rest] = pair.split('=');
    if (key && rest.length > 0) params[decode(key)] = decode(rest.join('='));
  }
  return params;
}

/* Supabase magic links redirect with tokens (or an error) in the URL fragment;
   query params handled as a fallback. Manual parse keeps custom schemes like
   inflectra:// working without relying on the platform URL implementation. */
export function authResultFromUrl(url: string): MagicLinkResult | null {
  const [beforeFragment, ...fragmentParts] = url.split('#');
  const queryStart = beforeFragment.indexOf('?');
  const params = {
    ...paramsFrom(queryStart === -1 ? undefined : beforeFragment.slice(queryStart + 1)),
    ...paramsFrom(fragmentParts.join('#') || undefined),
  };

  if (params.error || params.error_code || params.error_description) {
    return {
      type: 'error',
      message: params.error_description || params.error_code || params.error || 'Sign-in failed',
    };
  }
  if (params.access_token && params.refresh_token) {
    return { type: 'tokens', accessToken: params.access_token, refreshToken: params.refresh_token };
  }
  return null;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
