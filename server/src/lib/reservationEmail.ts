import QRCode from 'qrcode';
import { supabase } from './supabase';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function frDate(d?: string | null): string {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  if (!y || !m || !day) return d;
  return `${day} ${MOIS[m - 1]} ${y}`;
}

function frTime(t?: string | null): string {
  if (!t) return '';
  return t.slice(0, 5).replace(':', 'h'); // '10:00' -> '10h00'
}

/** Génère le QR (PNG), l'upload dans le bucket public 'assets', renvoie l'URL. */
async function qrUrl(qrCode: string, id: string): Promise<string | null> {
  try {
    const buf = await QRCode.toBuffer(qrCode, { width: 320, margin: 1, errorCorrectionLevel: 'M' });
    const path = `qr/${id}.png`;
    const { error } = await supabase.storage.from('assets').upload(path, buf, { contentType: 'image/png', upsert: true });
    if (error) return null;
    return supabase.storage.from('assets').getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;color:#8a8a8a;font-size:14px;">${label}</td>
    <td style="padding:6px 0;color:#1a1a1a;font-size:15px;font-weight:700;text-align:right;">${value}</td>
  </tr>`;
}

/**
 * Construit le mail de confirmation complet (date, heure, personnes,
 * transat/table + QR code). Renvoie null si la résa est introuvable.
 */
export async function buildReservationEmail(
  table: string,
  reservationId: string,
  firstName: string,
): Promise<{ subject: string; html: string } | null> {
  let title = 'Réservation confirmée';
  let rows = '';
  let qrCode = '';

  if (table === 'beach_reservations') {
    const { data: r } = await supabase
      .from('beach_reservations')
      .select('date, start_time, end_time, guest_count, qr_code')
      .eq('id', reservationId)
      .single();
    if (!r) return null;
    qrCode = r.qr_code;

    // Transats liés
    const { data: links } = await supabase.from('beach_reservation_sunbeds').select('sunbed_id').eq('reservation_id', reservationId);
    let sunbeds = '';
    if (links?.length) {
      const { data: sbs } = await supabase.from('sunbeds').select('label').in('id', links.map((l) => l.sunbed_id));
      sunbeds = (sbs ?? []).map((s) => s.label).join(', ');
    }

    title = 'Ta réservation transat est confirmée 🌞';
    rows =
      row('Date', frDate(r.date)) +
      row('Horaire', `${frTime(r.start_time)} – ${frTime(r.end_time)}`) +
      row('Personnes', String(r.guest_count ?? 1)) +
      (sunbeds ? row(links && links.length > 1 ? 'Transats' : 'Transat', sunbeds) : '');
  } else if (table === 'restaurant_reservations') {
    const { data: r } = await supabase
      .from('restaurant_reservations')
      .select('date, time_slot, guest_count, qr_code')
      .eq('id', reservationId)
      .single();
    if (!r) return null;
    qrCode = r.qr_code;

    const slot = r.time_slot === 'dinner' ? 'Dîner' : r.time_slot === 'lunch' ? 'Déjeuner' : String(r.time_slot ?? '');
    title = 'Ta réservation restaurant est confirmée 🍽️';
    rows =
      row('Date', frDate(r.date)) +
      (slot ? row('Service', slot) : '') +
      row('Personnes', String(r.guest_count ?? 2));
  } else {
    return null;
  }

  const qr = qrCode ? await qrUrl(qrCode, reservationId) : null;
  const qrBlock = qr
    ? `<div style="text-align:center;margin:26px 0 6px;">
         <img src="${qr}" alt="QR code réservation" width="200" height="200" style="border:1px solid #eee;border-radius:12px;" />
         <p style="color:#8a8a8a;font-size:13px;margin:8px 0 0;">Présente ce QR code à l'accueil</p>
       </div>`
    : '';

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;padding:8px;">
    <h2 style="color:#A3220B;margin:0 0 6px;">${title}</h2>
    <p style="color:#1a1a1a;font-size:15px;margin:0 0 16px;">Bonjour ${firstName || ''}, ta réservation est bien confirmée. Voici le récapitulatif :</p>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #eee;border-bottom:1px solid #eee;">
      ${rows}
    </table>
    ${qrBlock}
    <p style="color:#1a1a1a;font-size:15px;margin:20px 0 0;">À très vite à La Plage Tournesol ! 🌻</p>
    <p style="color:#b0b0b0;font-size:12px;margin:16px 0 0;">La Plage Tournesol · Estepona</p>
  </div>`;

  return { subject: `${title.replace(/ [🌞🍽️]+$/, '')} — La Plage Tournesol`, html };
}
