/**
 * Envoi de confirmations WhatsApp via Twilio Content API.
 *
 * Pré-requis (à configurer une fois côté Twilio Console) :
 *  1. Compte Twilio + numéro WhatsApp Sender approuvé (ou sandbox pour les tests).
 *  2. Un Content Template approuvé par Meta avec 3 variables :
 *       {{1}} = prénom du client (ou "client")
 *       {{2}} = type de réservation (Restaurant / Transat / Événement)
 *       {{3}} = référence de la réservation
 *     Exemple de message :
 *       "Bonjour {{1}}, votre réservation {{2}} (réf. {{3}}) à La Plage Tournesol
 *        est confirmée. À très vite !"
 *  3. Récupérer le Content SID (HX...) du template approuvé.
 *
 * Variables d'environnement requises :
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_WHATSAPP_FROM            ex: whatsapp:+14155238886 (sandbox) ou +33xxxxxxxxx
 *   TWILIO_TEMPLATE_SID_RESERVATION ex: HXxxxxxxxxxxxxxxxxxxxxxxxxxx
 */

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';

export interface WhatsAppConfirmationParams {
  toPhoneE164: string;          // ex: "+33612345678"
  firstName: string | null;
  reservationType: 'beach' | 'restaurant' | 'event';
  reservationId: string;
}

const typeLabels: Record<WhatsAppConfirmationParams['reservationType'], string> = {
  beach: 'Transat',
  restaurant: 'Restaurant',
  event: 'Événement',
};

function isE164(phone: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(phone);
}

/**
 * Tente de normaliser un numéro saisi librement vers le format E.164.
 * Heuristique focalisée FR + ES (clientèle Tournesol).
 *   "+33622334529"     → "+33622334529"
 *   "0033622334529"    → "+33622334529"
 *   "0622334529"       → "+33622334529"   (national FR, 0 + 9 chiffres)
 *   "622334529"        → "+34622334529"   (national ES, 9 chiffres sans 0)
 *   "+34 622 33 45 29" → "+34622334529"   (espaces/séparateurs)
 * Retourne null si on n'arrive pas à reconnaître un format plausible.
 */
export function normalizeToE164(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = input.trim().replace(/[\s.\-()]/g, '');
  if (s.startsWith('+')) {
    s = '+' + s.slice(1).replace(/\D/g, '');
  } else {
    s = s.replace(/\D/g, '');
  }
  if (isE164(s)) return s;
  if (s.startsWith('00')) {
    const c = '+' + s.slice(2);
    if (isE164(c)) return c;
  }
  if (/^0[1-9]\d{8}$/.test(s)) return '+33' + s.slice(1);
  if (/^[6789]\d{8}$/.test(s)) return '+34' + s;
  return null;
}

/**
 * Envoi générique : un template + ses variables, vers un numéro WhatsApp.
 */
export async function sendWhatsAppTemplate(
  toPhoneE164: string,
  variables: Record<string, string>,
  contentSidOverride?: string,
): Promise<{ ok: true; sid: string } | { ok: false; error: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromRaw = process.env.TWILIO_WHATSAPP_FROM;
  const contentSid = contentSidOverride ?? process.env.TWILIO_TEMPLATE_SID_RESERVATION;

  if (!accountSid || !authToken || !fromRaw || !contentSid) {
    return { ok: false, error: 'Twilio non configuré (vars d\'env manquantes)' };
  }

  const normalized = isE164(toPhoneE164) ? toPhoneE164 : normalizeToE164(toPhoneE164);
  if (!normalized) {
    return { ok: false, error: `Numéro invalide (E.164 attendu): ${toPhoneE164}` };
  }

  const from = fromRaw.startsWith('whatsapp:') ? fromRaw : `whatsapp:${fromRaw}`;
  const body = new URLSearchParams({
    From: from,
    To: `whatsapp:${normalized}`,
    ContentSid: contentSid,
    ContentVariables: JSON.stringify(variables),
  });

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  try {
    const res = await fetch(`${TWILIO_API_BASE}/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Twilio ${res.status}: ${text}` };
    }

    const data = (await res.json()) as { sid: string };
    return { ok: true, sid: data.sid };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Erreur réseau Twilio' };
  }
}

/**
 * Confirmation WhatsApp envoyée au CLIENT après réservation.
 */
export async function sendWhatsAppConfirmation(params: WhatsAppConfirmationParams) {
  return sendWhatsAppTemplate(params.toPhoneE164, {
    '1': params.firstName?.trim() || 'client',
    '2': typeLabels[params.reservationType],
    '3': params.reservationId,
  });
}

/**
 * Notification WhatsApp envoyée à l'ADMIN à chaque nouvelle réservation.
 * Utilise le template dédié `admin_new_reservation_tournesol` :
 *   {{1}} = description compacte de la réservation
 *   {{2}} = reservationId
 */
export async function sendWhatsAppAdminNotification(params: {
  toPhoneE164: string;
  description: string;
  reservationId: string;
}) {
  const sid = process.env.TWILIO_TEMPLATE_SID_ADMIN_NOTIF;
  if (!sid) return { ok: false as const, error: 'TWILIO_TEMPLATE_SID_ADMIN_NOTIF absent' };
  return sendWhatsAppTemplate(
    params.toPhoneE164,
    {
      '1': params.description,
      '2': params.reservationId,
    },
    sid,
  );
}

const reminderTypeLabels: Record<'beach' | 'restaurant' | 'event', string> = {
  beach: 'Plage',
  restaurant: 'Restaurant',
  event: 'Événement',
};

/**
 * Rappel WhatsApp (J-1 ou H-2) envoyé au client.
 * Utilise le template `reminder_tournesol` (TWILIO_TEMPLATE_SID_REMINDER) :
 *   {{1}} = prénom
 *   {{2}} = type de réservation (Plage / Restaurant / Événement)
 *   {{3}} = timing libre ("demain", "dans 2 heures", "ce soir à 20h30"...)
 */
export async function sendWhatsAppReminder(params: {
  toPhoneE164: string;
  firstName: string | null;
  reservationType: 'beach' | 'restaurant' | 'event';
  timing: string;
}) {
  const sid = process.env.TWILIO_TEMPLATE_SID_REMINDER;
  if (!sid) return { ok: false as const, error: 'TWILIO_TEMPLATE_SID_REMINDER absent' };
  return sendWhatsAppTemplate(
    params.toPhoneE164,
    {
      '1': params.firstName?.trim() || 'client',
      '2': reminderTypeLabels[params.reservationType],
      '3': params.timing,
    },
    sid,
  );
}
