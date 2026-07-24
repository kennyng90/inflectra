import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import { authResultFromUrl } from '@/lib/magic-link';
import { supabase } from '@/lib/supabase';

type AuthState = {
  session: Session | null;
  /* False until the persisted session has been restored. */
  isReady: boolean;
  /* Error carried in a magic-link redirect (e.g. expired link). */
  linkError: string | null;
  clearLinkError: () => void;
};

/* Captured at import time: expo-router's first navigation strips the
   magic-link fragment from the address bar before effects run. */
const initialWebUrl =
  Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.href : null;
const initialWebAuthResult = initialWebUrl ? authResultFromUrl(initialWebUrl) : null;

const AuthContext = createContext<AuthState>({
  session: null,
  isReady: true,
  linkError: null,
  clearLinkError: () => {},
});

function stripAuthParamsFromLocation() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  window.history.replaceState(null, '', window.location.pathname);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(!supabase);
  /* Keeps the loading gate closed while a magic link's tokens are being
     exchanged, so the sign-in form doesn't flash before the tabs. */
  const [consumingLink, setConsumingLink] = useState(
    supabase !== null && initialWebAuthResult?.type === 'tokens',
  );
  const [linkError, setLinkError] = useState<string | null>(null);
  const clearLinkError = useCallback(() => setLinkError(null), []);

  useEffect(() => {
    if (!supabase) return;
    /* INITIAL_SESSION fires once the persisted session is restored. */
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setIsReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const consume = async (url: string | null) => {
      const result = url ? authResultFromUrl(url) : null;
      if (!result) return;
      stripAuthParamsFromLocation();
      if (result.type === 'error') {
        setLinkError(result.message);
      } else {
        const { error } = await client.auth.setSession({
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
        });
        if (error) setLinkError(error.message);
      }
      setConsumingLink(false);
    };
    if (initialWebUrl) {
      consume(initialWebUrl);
    } else {
      Linking.getInitialURL().then(consume);
    }
    const subscription = Linking.addEventListener('url', ({ url }) => consume(url));
    return () => subscription.remove();
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, isReady: isReady && !consumingLink, linkError, clearLinkError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
