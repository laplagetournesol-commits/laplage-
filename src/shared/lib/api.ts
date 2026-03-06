import { supabase } from './supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Helper pour appeler le serveur API Tournesol.
 * Ajoute automatiquement le token Supabase en header Authorization.
 */
export async function apiCall<T = any>(
  path: string,
  body?: Record<string, any>,
): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error ?? `Erreur API (${res.status})`);
  }

  return json;
}
