import { supabase } from './supabase';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

interface PushMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  data?: Record<string, any>;
}

/**
 * Envoie des push notifications à une liste de tokens Expo.
 * Traite par batch de 100 (limite Expo Push API).
 */
export async function sendPushToTokens(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<number> {
  if (tokens.length === 0) return 0;

  let totalSent = 0;

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    const messages: PushMessage[] = batch.map((token) => ({
      to: token,
      title,
      body,
      sound: 'default' as const,
      ...(data ? { data } : {}),
    }));

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });

      if (response.ok) {
        totalSent += batch.length;
      } else {
        console.error(
          `Erreur Expo Push batch [${i}-${i + batch.length}]:`,
          await response.text(),
        );
      }
    } catch (err) {
      console.error(`Erreur réseau Expo Push batch [${i}]:`, err);
    }
  }

  return totalSent;
}

/**
 * Envoie une push notification à un utilisateur (tous ses devices).
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<number> {
  const { data: tokenRows } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId);

  const tokens = tokenRows?.map((r) => r.token) ?? [];
  return sendPushToTokens(tokens, title, body, data);
}

/**
 * Envoie une push notification à plusieurs utilisateurs.
 */
export async function sendPushToUsers(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<number> {
  if (userIds.length === 0) return 0;

  const { data: tokenRows } = await supabase
    .from('push_tokens')
    .select('token')
    .in('user_id', userIds);

  const tokens = tokenRows?.map((r) => r.token) ?? [];
  return sendPushToTokens(tokens, title, body, data);
}

/**
 * Envoie une push notification à tous les utilisateurs enregistrés.
 */
export async function sendPushToAll(
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<number> {
  const { data: tokenRows } = await supabase
    .from('push_tokens')
    .select('token');

  const tokens = tokenRows?.map((r) => r.token) ?? [];
  return sendPushToTokens(tokens, title, body, data);
}
