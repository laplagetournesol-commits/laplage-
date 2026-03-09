import * as http2 from 'http2';
import * as crypto from 'crypto';
import { supabase } from './supabase';

// Configuration APNs via variables d'environnement
const APNS_KEY_ID = process.env.APNS_KEY_ID ?? '';
const APNS_TEAM_ID = process.env.APNS_TEAM_ID ?? '';
const APNS_KEY = (process.env.APNS_KEY ?? '').replace(/\\n/g, '\n');
const APNS_BUNDLE_ID = process.env.APNS_BUNDLE_ID ?? 'com.lestournesols.app';
const APNS_HOST = process.env.APNS_PRODUCTION === 'true'
  ? 'https://api.push.apple.com'
  : 'https://api.sandbox.push.apple.com';

let cachedJwt: { token: string; timestamp: number } | null = null;

/**
 * Génère un JWT pour l'authentification APNs (valide ~50 min, renouvelé toutes les 45 min).
 */
function getApnsJwt(): string {
  const now = Math.floor(Date.now() / 1000);

  if (cachedJwt && now - cachedJwt.timestamp < 45 * 60) {
    return cachedJwt.token;
  }

  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: APNS_KEY_ID })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iss: APNS_TEAM_ID, iat: now })).toString('base64url');

  const signer = crypto.createSign('SHA256');
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(APNS_KEY, 'base64url');

  const token = `${header}.${payload}.${signature}`;
  cachedJwt = { token, timestamp: now };
  return token;
}

/**
 * Envoie une notification push via APNs HTTP/2.
 */
function sendToApns(deviceToken: string, title: string, body: string, data?: Record<string, any>): Promise<boolean> {
  return new Promise((resolve) => {
    if (!APNS_KEY || !APNS_KEY_ID || !APNS_TEAM_ID) {
      console.error('APNs non configuré : APNS_KEY, APNS_KEY_ID ou APNS_TEAM_ID manquant');
      resolve(false);
      return;
    }

    const client = http2.connect(APNS_HOST);

    client.on('error', (err) => {
      console.error('Erreur connexion APNs:', err);
      resolve(false);
    });

    const payload = JSON.stringify({
      aps: {
        alert: { title, body },
        sound: 'default',
      },
      ...(data ?? {}),
    });

    const headers = {
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      'authorization': `bearer ${getApnsJwt()}`,
      'apns-topic': APNS_BUNDLE_ID,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    };

    const req = client.request(headers);

    let responseData = '';
    req.on('data', (chunk: Buffer) => { responseData += chunk; });

    req.on('response', (headers) => {
      const status = headers[':status'];
      if (status === 200) {
        resolve(true);
      } else {
        console.error(`APNs erreur ${status} pour token ${deviceToken.slice(0, 8)}...:`, responseData);
        resolve(false);
      }
    });

    req.on('end', () => { client.close(); });
    req.on('error', () => { resolve(false); });

    req.end(payload);
  });
}

/**
 * Envoie des push notifications à une liste de device tokens.
 */
export async function sendPushToTokens(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<number> {
  if (tokens.length === 0) return 0;

  const results = await Promise.allSettled(
    tokens.map((token) => sendToApns(token, title, body, data)),
  );

  return results.filter((r) => r.status === 'fulfilled' && r.value).length;
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
