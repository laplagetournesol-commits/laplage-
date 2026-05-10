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

  if (!isE164(toPhoneE164)) {
    return { ok: false, error: `Numéro invalide (E.164 attendu): ${toPhoneE164}` };
  }

  const from = fromRaw.startsWith('whatsapp:') ? fromRaw : `whatsapp:${fromRaw}`;
  const body = new URLSearchParams({
    From: from,
    To: `whatsapp:${toPhoneE164}`,
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
 * Réutilise le template client (sandbox-friendly) en hijackant les variables :
 *   {{1}} = "admin" → produit "Bonjour admin, ..."
 *   {{2}} = description compacte de la réservation
 *   {{3}} = reservationId
 */
export async function sendWhatsAppAdminNotification(params: {
  toPhoneE164: string;
  description: string;
  reservationId: string;
}) {
  return sendWhatsAppTemplate(params.toPhoneE164, {
    '1': 'admin',
    '2': params.description,
    '3': params.reservationId,
  });
}
