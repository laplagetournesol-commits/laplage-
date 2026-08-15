import { Router } from 'express';
import { Resend } from 'resend';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { sendPushToTokens, sendPushToUser, sendPushToUsers, sendPushToAll } from '../lib/push';
import { sendWhatsAppConfirmation, sendWhatsAppAdminNotification, sendWhatsAppGuestPayment } from '../lib/whatsapp';
import { sendReminders } from '../cron/reminders';

const router = Router();

const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'reservations@laplage-tournesol.com';

async function sendConfirmationEmail(
  userId: string,
  type: 'beach' | 'restaurant',
  reservationId: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const table = type === 'beach' ? 'beach_reservations' : 'restaurant_reservations';
  const { data: resa } = await supabase
    .from(table)
    .select('date, time, time_slot, guest_count, guest_email, guest_name, special_requests, qr_code, guest_payment_requested, guest_payment_token, total_price')
    .eq('id', reservationId)
    .single();

  // Réservation faite PAR la plage (admin) pour un invité ? (pas une résa client)
  const madeByBeach = (resa as any)?.special_requests === 'Réservation admin';

  // QR code (image) à la place d'un numéro de référence. Échec silencieux = pas de QR.
  let qrImgUrl: string | null = null;
  const qrValue = (resa as any)?.qr_code;
  if (qrValue) {
    try {
      const QRCode = (await import('qrcode')).default;
      const buf = await QRCode.toBuffer(String(qrValue), { width: 320, margin: 1, errorCorrectionLevel: 'M' });
      const path = `qr/${reservationId}.png`;
      const { error: upErr } = await supabase.storage.from('assets').upload(path, buf, { contentType: 'image/png', upsert: true });
      if (!upErr) qrImgUrl = supabase.storage.from('assets').getPublicUrl(path).data.publicUrl;
    } catch { /* pas de QR si échec */ }
  }

  // Si la résa a été faite "pour un ami" (guest_email renseigné), envoyer la
  // confirmation à l'invité. Sinon, à l'email du compte qui a réservé.
  let to: string | null = (resa as any)?.guest_email ?? null;
  if (!to) {
    const { data: authData } = await supabase.auth.admin.getUserById(userId);
    to = authData?.user?.email ?? null;
  }
  if (!to) return;

  const typeLabel = type === 'beach' ? 'Transat' : 'Restaurant';
  const formattedDate = resa?.date
    ? new Date(`${resa.date}T00:00:00`).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';
  const service = resa?.time
    ?? (resa?.time_slot === 'dinner' ? 'Dîner' : resa?.time_slot === 'lunch' ? 'Déjeuner' : '');

  // Variante "pour un ami" avec paiement : email de DEMANDE DE PAIEMENT (payer = confirmer).
  if ((resa as any)?.guest_payment_requested && (resa as any)?.guest_payment_token) {
    const APP_URL = process.env.PUBLIC_WEB_URL ?? 'https://laplagetournesols.com';
    const payUrl = `${APP_URL}/pay/${(resa as any).guest_payment_token}`;
    const firstName = String((resa as any)?.guest_name ?? '').trim().split(/\s+/)[0] || '';
    const amount = Number((resa as any)?.total_price) || 0;
    try {
      await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: fromEmail,
        to,
        subject: 'Confirmez votre place — La Plage Tournesol',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color:#3D434F;">La Plage Tournesol ☀️</h2>
            <p>Bonjour ${firstName},</p>
            <p>Une place vous a été réservée à La Plage Tournesol${formattedDate ? ` pour le <strong>${formattedDate}</strong>` : ''}.</p>
            <p>Pour <strong>confirmer votre venue</strong>, réglez votre place${amount ? ` (<strong>${amount}€</strong>)` : ''} en ligne :</p>
            <div style="text-align:center;margin:26px 0;">
              <a href="${payUrl}" style="background:#3D434F;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;display:inline-block;">Payer &amp; confirmer</a>
            </div>
            <p style="color:#888;font-size:13px;">Ou copiez ce lien : ${payUrl}</p>
            <p style="color:#888;font-size:12px;">La Plage Tournesol</p>
          </div>
        `,
      });
    } catch (err) {
      console.error('Erreur envoi email paiement invité:', err);
    }
    return;
  }

  try {
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: fromEmail,
      to,
      subject: `Confirmation ${typeLabel} - La Plage Tournesol`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a5276;">Réservation confirmée</h2>
          <p>Votre réservation <strong>${typeLabel}</strong> est confirmée.</p>
          ${formattedDate ? `<p>Date : <strong>${formattedDate}</strong></p>` : ''}
          ${service ? `<p>Créneau : <strong>${service}</strong></p>` : ''}
          ${resa?.guest_count ? `<p>Personnes : <strong>${resa.guest_count}</strong></p>` : ''}
          ${type === 'beach' && madeByBeach ? `
          <div style="background:#fdecea;border:1px solid #f5c6c0;border-radius:8px;padding:12px 14px;margin:16px 0;color:#a3220b;font-size:14px;line-height:1.5;">
            <strong>⚠️ Important :</strong> merci d'arriver <strong>avant 13h00</strong>, car passé cette heure — ou sans nous prévenir — votre transat pourra être réattribué.<br>
            <span style="color:#8a3b2f;">Please arrive <strong>before 1:00 PM</strong>, as after this time — or without notice — your sunbed may be reassigned.</span>
          </div>` : ''}
          ${qrImgUrl ? `<div style="text-align:center;margin:22px 0 6px;"><img src="${qrImgUrl}" alt="QR code" width="180" height="180" style="border:1px solid #eee;border-radius:12px;" /><p style="color:#8a8a8a;font-size:13px;margin:8px 0 0;">Présentez ce QR code à l'accueil</p></div>` : ''}
          <p>Merci et à bientôt !</p>
          <p style="color: #888; font-size: 12px;">La Plage Tournesol</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Erreur envoi email confirmation:', err);
  }
}

async function sendWhatsAppToUser(
  userId: string,
  type: 'beach' | 'restaurant',
  reservationId: string,
): Promise<void> {
  // Si la résa a été faite "pour un ami" (admin booking), envoyer au guest
  // plutôt qu'au booker. Sinon, fallback sur le profil du booker.
  const table = type === 'beach' ? 'beach_reservations' : 'restaurant_reservations';
  const { data: reservation } = await supabase
    .from(table)
    .select('guest_name, guest_phone, guest_payment_requested, guest_payment_token, date')
    .eq('id', reservationId)
    .single();

  let toPhone: string | null = null;
  let firstName: string | null = null;

  if (reservation?.guest_phone) {
    toPhone = reservation.guest_phone;
    firstName = reservation.guest_name?.trim().split(/\s+/)[0] ?? null;
  } else {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', userId)
      .single();
    if (profile?.phone) {
      toPhone = profile.phone;
      firstName = profile.full_name?.trim().split(/\s+/)[0] ?? null;
    }
  }

  if (!toPhone) return;

  // Variante "pour un ami" avec paiement : template avec bouton de paiement.
  if ((reservation as any)?.guest_payment_requested && (reservation as any)?.guest_payment_token) {
    const dateLabel = (reservation as any)?.date
      ? new Date(`${(reservation as any).date}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      : '';
    const r = await sendWhatsAppGuestPayment({
      toPhoneE164: toPhone,
      firstName,
      bookerName: 'La Plage Tournesol',
      dateLabel,
      token: String((reservation as any).guest_payment_token),
    });
    if (!r.ok) console.error('Erreur WhatsApp paiement invité:', r.error);
    return;
  }

  const result = await sendWhatsAppConfirmation({
    toPhoneE164: toPhone,
    firstName,
    reservationType: type,
    reservationId,
  });

  if (!result.ok) {
    console.error('Erreur envoi WhatsApp:', result.error);
  }
}

const ADMIN_NOTIFY_EMAIL = 'johanna@dresscodepress.com';

async function sendAdminNotificationEmail(
  bookerUserId: string,
  type: 'beach' | 'restaurant',
  reservationId: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const { data: bookerProfile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', bookerUserId)
    .single();

  const table = type === 'beach' ? 'beach_reservations' : 'restaurant_reservations';
  const { data: resa } = await supabase
    .from(table)
    .select('date, time, time_slot, guest_count, deposit_amount, deposit_paid, total_price, guest_name, guest_email, guest_phone')
    .eq('id', reservationId)
    .single();

  const typeLabel = type === 'beach' ? 'Plage' : 'Restaurant';
  const formattedDate = resa?.date
    ? new Date(`${resa.date}T00:00:00`).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';
  const service = (resa as any)?.time
    ?? ((resa as any)?.time_slot === 'dinner' ? 'Dîner' : (resa as any)?.time_slot === 'lunch' ? 'Déjeuner' : '');

  const clientName = (resa as any)?.guest_name ?? bookerProfile?.full_name ?? 'Client';
  const clientContact = (resa as any)?.guest_email ?? (resa as any)?.guest_phone ?? bookerProfile?.email ?? '';
  const guests = (resa as any)?.guest_count ?? '?';
  const deposit = (resa as any)?.deposit_amount ?? 0;
  const depositPaid = (resa as any)?.deposit_paid ?? false;
  const totalPrice = (resa as any)?.total_price;

  try {
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: fromEmail,
      to: ADMIN_NOTIFY_EMAIL,
      subject: `[Nouvelle résa ${typeLabel}] ${clientName} — ${formattedDate}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a5276;">Nouvelle réservation ${typeLabel}</h2>
          <table style="border-collapse: collapse; width: 100%;">
            <tr><td style="padding:6px;color:#666;">Client :</td><td style="padding:6px;"><strong>${clientName}</strong></td></tr>
            <tr><td style="padding:6px;color:#666;">Contact :</td><td style="padding:6px;">${clientContact}</td></tr>
            <tr><td style="padding:6px;color:#666;">Date :</td><td style="padding:6px;"><strong>${formattedDate}</strong></td></tr>
            ${service ? `<tr><td style="padding:6px;color:#666;">Créneau :</td><td style="padding:6px;">${service}</td></tr>` : ''}
            <tr><td style="padding:6px;color:#666;">Personnes :</td><td style="padding:6px;">${guests}</td></tr>
            ${totalPrice != null ? `<tr><td style="padding:6px;color:#666;">Total :</td><td style="padding:6px;"><strong>${totalPrice}€</strong></td></tr>` : ''}
            ${deposit > 0 ? `<tr><td style="padding:6px;color:#666;">Caution :</td><td style="padding:6px;">${deposit}€ — ${depositPaid ? '✅ Payée' : '⏳ Non payée'}</td></tr>` : ''}
            <tr><td style="padding:6px;color:#666;">Référence :</td><td style="padding:6px;font-family:monospace;font-size:11px;">${reservationId}</td></tr>
          </table>
        </div>
      `,
    });
  } catch (err) {
    console.error('Erreur envoi email admin:', err);
  }
}

async function sendWhatsAppToAdmins(
  bookerUserId: string,
  type: 'beach' | 'restaurant',
  reservationId: string,
): Promise<void> {
  const { data: admins } = await supabase
    .from('profiles')
    .select('id, phone')
    .eq('role', 'admin');

  const adminPhones = (admins ?? [])
    .filter((a) => a.id !== bookerUserId && a.phone)
    .map((a) => a.phone as string);

  if (adminPhones.length === 0) return;

  const { data: bookerProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', bookerUserId)
    .single();

  const table = type === 'beach' ? 'beach_reservations' : 'restaurant_reservations';
  const { data: resa } = await supabase
    .from(table)
    .select('date, time, time_slot, guest_count')
    .eq('id', reservationId)
    .single();

  const clientName = bookerProfile?.full_name?.trim() || 'Client';
  const typeLabel = type === 'beach' ? 'Transat' : 'Restaurant';
  const formattedDate = resa?.date
    ? new Date(`${resa.date}T00:00:00`).toLocaleDateString('fr-FR', {
        weekday: 'short', day: 'numeric', month: 'short',
      })
    : '';
  const service = type === 'restaurant'
    ? (resa?.time ? ` ${resa.time}` : resa?.time_slot === 'dinner' ? ' (dîner)' : resa?.time_slot === 'lunch' ? ' (déjeuner)' : '')
    : '';
  const guests = resa?.guest_count ? `${resa.guest_count} pers.` : '';

  const description = `${typeLabel} ${clientName} ${guests} ${formattedDate}${service}`.replace(/\s+/g, ' ').trim();

  for (const phone of adminPhones) {
    const result = await sendWhatsAppAdminNotification({
      toPhoneE164: phone,
      description,
      reservationId,
    });
    if (!result.ok) {
      console.error(`Erreur WhatsApp admin (${phone}):`, result.error);
    }
  }
}

async function notifyAdminsOfNewReservation(
  bookerUserId: string,
  type: 'beach' | 'restaurant',
  reservationId: string,
): Promise<void> {
  const { data: admins } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'admin');

  const adminIds = (admins ?? [])
    .map((a) => a.id)
    .filter((id) => id !== bookerUserId);

  if (adminIds.length === 0) return;

  const { data: bookerProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', bookerUserId)
    .single();

  const table = type === 'beach' ? 'beach_reservations' : 'restaurant_reservations';
  const { data: resa } = await supabase
    .from(table)
    .select('date, time, time_slot, guest_count')
    .eq('id', reservationId)
    .single();

  const clientName = bookerProfile?.full_name ?? 'Un client';
  const typeLabel = type === 'beach' ? 'plage' : 'restaurant';
  const formattedDate = resa?.date
    ? new Date(`${resa.date}T00:00:00`).toLocaleDateString('fr-FR', {
        weekday: 'short', day: 'numeric', month: 'short',
      })
    : '';
  const service = type === 'restaurant' && resa?.time
    ? ` à ${resa.time}`
    : type === 'restaurant' && resa?.time_slot
      ? resa.time_slot === 'dinner' ? ' (dîner)' : ' (déjeuner)'
      : '';
  const guests = resa?.guest_count ? `${resa.guest_count} pers.` : '';

  const title = `Nouvelle réservation ${typeLabel}`;
  const body = `${clientName} — ${guests}${formattedDate ? ` — ${formattedDate}${service}` : ''}`.trim();

  await sendPushToUsers(
    adminIds,
    title,
    body,
    { type: 'admin_new_reservation', reservationType: type, reservationId },
  );
}

/**
 * POST /api/notifications/register-token
 * Enregistre un push token Expo pour l'utilisateur connecté.
 */
router.post('/register-token', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { token, platform } = req.body;
    const userId = req.user!.id;

    if (!token) {
      res.status(400).json({ error: 'token est requis' });
      return;
    }

    await supabase.from('push_tokens').upsert(
      { user_id: userId, token, platform: platform ?? 'ios' },
      { onConflict: 'token' },
    );

    res.json({ success: true });
  } catch (err: any) {
    console.error('Erreur register-token:', err);
    res.status(500).json({ error: 'Erreur interne' });
  }
});

/**
 * POST /api/notifications/push
 * Envoie des notifications push via Expo Push API (admin uniquement)
 */
router.post('/push', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { title, body, segment, data } = req.body;

    if (!title || !body) {
      res.status(400).json({ error: 'title et body sont requis' });
      return;
    }

    // Récupérer les tokens selon le segment
    let tokens: string[] = [];

    if (segment === 'vip') {
      const { data: result } = await supabase
        .from('push_tokens')
        .select('token, profile:profiles!inner(vip_level)')
        .in('profiles.vip_level', ['silver', 'gold', 'platinum']);
      tokens = result?.map((r: any) => r.token) ?? [];
    } else if (segment === 'gold+') {
      const { data: result } = await supabase
        .from('push_tokens')
        .select('token, profile:profiles!inner(vip_level)')
        .in('profiles.vip_level', ['gold', 'platinum']);
      tokens = result?.map((r: any) => r.token) ?? [];
    } else if (segment === 'event_attendees') {
      const { data: tickets } = await supabase
        .from('event_tickets')
        .select('user_id')
        .in('status', ['active', 'used']);

      if (tickets && tickets.length > 0) {
        const userIds = [...new Set(tickets.map((t) => t.user_id))];
        const { data: result } = await supabase
          .from('push_tokens')
          .select('token')
          .in('user_id', userIds);
        tokens = result?.map((r) => r.token) ?? [];
      }
    } else if (segment === 'beach_clients') {
      const { data: reservations } = await supabase
        .from('beach_reservations')
        .select('user_id')
        .eq('status', 'confirmed');

      if (reservations && reservations.length > 0) {
        const userIds = [...new Set(reservations.map((r) => r.user_id))];
        const { data: result } = await supabase
          .from('push_tokens')
          .select('token')
          .in('user_id', userIds);
        tokens = result?.map((r) => r.token) ?? [];
      }
    } else if (segment === 'restaurant_clients') {
      const { data: reservations } = await supabase
        .from('restaurant_reservations')
        .select('user_id')
        .eq('status', 'confirmed');

      if (reservations && reservations.length > 0) {
        const userIds = [...new Set(reservations.map((r) => r.user_id))];
        const { data: result } = await supabase
          .from('push_tokens')
          .select('token')
          .in('user_id', userIds);
        tokens = result?.map((r) => r.token) ?? [];
      }
    } else {
      // all
      const { data: result } = await supabase
        .from('push_tokens')
        .select('token');
      tokens = result?.map((r) => r.token) ?? [];
    }

    if (tokens.length === 0) {
      res.json({ success: true, sent: 0 });
      return;
    }

    const totalSent = await sendPushToTokens(tokens, title, body, data);

    // Sauvegarder dans l'historique
    await supabase.from('push_notifications').insert({
      title,
      body,
      target_segment: segment ?? 'all',
      data: data ?? null,
      sent_count: totalSent,
      sent_at: new Date().toISOString(),
    });

    res.json({ success: true, sent: totalSent });
  } catch (err: any) {
    console.error('Erreur push notification:', err);
    res.status(500).json({ error: 'Erreur interne' });
  }
});

/**
 * POST /api/notifications/event-published
 * Notifie tous les utilisateurs qu'un nouvel événement est publié (admin uniquement).
 */
router.post('/event-published', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { eventId, title } = req.body;

    if (!eventId || !title) {
      res.status(400).json({ error: 'eventId et title sont requis' });
      return;
    }

    const sent = await sendPushToAll(
      'Nouvel événement',
      `${title} — Réserve ta place !`,
      { type: 'event_published', eventId },
    );

    res.json({ success: true, sent });
  } catch (err: any) {
    console.error('Erreur event-published:', err);
    res.status(500).json({ error: 'Erreur interne' });
  }
});

/**
 * POST /api/notifications/booking-confirmed
 * Envoie une push de confirmation de réservation à l'utilisateur.
 */
router.post('/booking-confirmed', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { type, reservationId } = req.body;

    if (!type || !reservationId) {
      res.status(400).json({ error: 'type et reservationId sont requis' });
      return;
    }

    const label = type === 'beach' ? 'plage' : 'restaurant';
    const sent = await sendPushToUser(
      userId,
      'Réservation confirmée',
      `Votre réservation ${label} a été enregistrée. À bientôt !`,
      { type: 'booking_confirmed', reservationType: type, reservationId },
    );

    sendConfirmationEmail(userId, type, reservationId).catch((err) => {
      console.error('Email confirmation échoué:', err);
    });

    sendWhatsAppToUser(userId, type, reservationId).catch((err) => {
      console.error('WhatsApp confirmation échoué:', err);
    });

    sendAdminNotificationEmail(userId, type, reservationId).catch((err) => {
      console.error('Email admin échoué:', err);
    });

    sendWhatsAppToAdmins(userId, type, reservationId).catch((err) => {
      console.error('WhatsApp admin échoué:', err);
    });

    notifyAdminsOfNewReservation(userId, type, reservationId).catch((err) => {
      console.error('Push admin échoué:', err);
    });

    res.json({ success: true, sent });
  } catch (err: any) {
    console.error('Erreur booking-confirmed:', err);
    res.status(500).json({ error: 'Erreur interne' });
  }
});

/**
 * POST /api/notifications/trigger-reminders
 * Déclenche manuellement les rappels J-1 (admin uniquement).
 */
router.post('/trigger-reminders', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await sendReminders();
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Erreur trigger-reminders:', err);
    res.status(500).json({ error: 'Erreur interne' });
  }
});

export default router;
