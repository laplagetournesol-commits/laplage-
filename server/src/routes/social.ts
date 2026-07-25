import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { sendPushToUser } from '../lib/push';

const router = Router();

/**
 * POST /api/social/notify — envoie un push au destinataire d'un message.
 * Le message est déjà inséré par le client (direct Supabase, RLS). Ici on
 * envoie juste la notification, en tâche de fond, à partir de l'id du message.
 * Body: { message_id }
 */
router.post('/notify', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const senderId = req.user!.id;
    const { message_id } = req.body as { message_id?: string };
    if (!message_id) {
      res.status(400).json({ error: 'message_id manquant' });
      return;
    }
    // On récupère le message et on vérifie qu'il appartient bien à l'expéditeur
    const { data: msg } = await supabase
      .from('social_messages')
      .select('id, sender_id, recipient_id, kind, body')
      .eq('id', message_id)
      .maybeSingle();
    if (!msg || msg.sender_id !== senderId) {
      res.status(403).json({ error: 'Message introuvable' });
      return;
    }
    // Nom de l'expéditeur + aperçu selon le type
    const { data: prof } = await supabase.from('social_profiles').select('nickname').eq('user_id', senderId).maybeSingle();
    const senderName = prof?.nickname || 'Nouveau message';
    const preview =
      msg.kind === 'image' ? '📷 Photo' :
      msg.kind === 'audio' ? '🎤 Note vocale' :
      String(msg.body || '').slice(0, 140);

    const sent = await sendPushToUser(msg.recipient_id, senderName, preview, {
      type: 'social_message',
      peerId: senderId,
    });
    res.json({ ok: true, sent });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Erreur push' });
  }
});

/**
 * POST /api/social/translate — traduit un texte via DeepL.
 * Body: { text, target } (target = 'fr' | 'es' | 'en' …)
 */
const DEEPL_TARGET: Record<string, string> = { en: 'EN-GB', fr: 'FR', es: 'ES', pt: 'PT-PT', de: 'DE', it: 'IT' };

router.post('/translate', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { text, target } = req.body as { text?: string; target?: string };
    const clean = String(text ?? '').trim();
    if (!clean) {
      res.status(400).json({ error: 'Texte vide' });
      return;
    }
    const key = process.env.DEEPL_API_KEY;
    if (!key) {
      res.status(500).json({ error: 'Traduction non configurée' });
      return;
    }
    const targetLang = DEEPL_TARGET[String(target ?? 'en').toLowerCase()] ?? 'EN-GB';
    const params = new URLSearchParams();
    params.append('text', clean.slice(0, 1000));
    params.append('target_lang', targetLang);

    const endpoint = key.endsWith(':fx') ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate';
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!r.ok) {
      res.status(502).json({ error: 'Traduction indisponible' });
      return;
    }
    const j: any = await r.json();
    res.json({
      translated: j?.translations?.[0]?.text ?? '',
      detected: j?.translations?.[0]?.detected_source_language ?? '',
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Erreur traduction' });
  }
});

export default router;
