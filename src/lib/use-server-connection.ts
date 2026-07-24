import { useEffect, useState } from 'react';

import { supabase, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';

export type ServerConnectionStatus = 'unconfigured' | 'checking' | 'connected' | 'offline';

/* The client is initialized at import time; this confirms the project is
   actually reachable by hitting the public auth health endpoint. */
export async function checkServerConnection(
  url: string,
  anonKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<'connected' | 'offline'> {
  try {
    const response = await fetchFn(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
    });
    return response.ok ? 'connected' : 'offline';
  } catch {
    return 'offline';
  }
}

let pendingCheck: Promise<'connected' | 'offline'> | null = null;

/* Kicked off once at launch (root layout); Settings reuses the same result. */
export function startServerConnectionCheck(): Promise<'connected' | 'offline'> | null {
  if (!supabase || !supabaseUrl || !supabaseAnonKey) return null;
  pendingCheck ??= checkServerConnection(supabaseUrl, supabaseAnonKey);
  return pendingCheck;
}

export function useServerConnection(): ServerConnectionStatus {
  const [status, setStatus] = useState<ServerConnectionStatus>(supabase ? 'checking' : 'unconfigured');

  useEffect(() => {
    const check = startServerConnectionCheck();
    if (!check) return;
    let cancelled = false;
    check.then((result) => {
      if (!cancelled) setStatus(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
