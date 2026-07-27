import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { SERVER_UNCONFIGURED, UserFacingError } from '@/lib/user-facing-error';

export const APPLE_SIGN_IN_FAILED = "Couldn't sign in with Apple. Try again.";

/* Thrown by signInAsync when the user dismisses Apple's sheet. */
const CANCELED_CODE = 'ERR_REQUEST_CANCELED';

export type AppleSignInOutcome = 'signed-in' | 'canceled';

export function isAppleSignInCanceled(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === CANCELED_CODE
  );
}

/* False off iOS, where the native module reports itself unavailable and the
   email link stays the only way in. */
export function useAppleSignInAvailable(): boolean {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    AppleAuthentication.isAvailableAsync()
      .then((supported) => active && setAvailable(supported))
      .catch(() => active && setAvailable(false));
    return () => {
      active = false;
    };
  }, []);

  return available;
}

export function fullNameFrom(
  name: AppleAuthentication.AppleAuthenticationFullName | null,
): string | null {
  const parts = [name?.givenName, name?.middleName, name?.familyName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

/* Apple hands over the name only on the very first authorization, so it has to
   be copied into user metadata right then or it is lost until the user revokes
   access. A failure here is cosmetic - the session is already live. */
async function saveFullName(fullName: string) {
  try {
    await supabase?.auth.updateUser({ data: { full_name: fullName } });
  } catch {
    /* ignored */
  }
}

export async function signInWithApple(): Promise<AppleSignInOutcome> {
  if (!supabase) throw new UserFacingError(SERVER_UNCONFIGURED);

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (error) {
    if (isAppleSignInCanceled(error)) return 'canceled';
    throw error;
  }

  if (!credential.identityToken) throw new UserFacingError(APPLE_SIGN_IN_FAILED);

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw new UserFacingError(error.message);

  const fullName = fullNameFrom(credential.fullName);
  if (fullName) await saveFullName(fullName);

  return 'signed-in';
}
