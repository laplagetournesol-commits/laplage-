// CA quotidien de l'APPLI (série W) — envoyé chaque soir à 20h00 (launchd).
// Total encaissé par l'application aujourd'hui : réservations plage + commandes.
// WorkingDirectory attendu : .../tournesol/server
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const val = (k) => (env.match(new RegExp(`${k}=(.+)`)) || [])[1]?.trim();
const sb = createClient(val('SUPABASE_URL'), val('SUPABASE_SERVICE_ROLE_KEY'));
const resend = new Resend(val('RESEND_API_KEY'));
const FROM = val('RESEND_FROM_EMAIL') || 'contact@laplagetournesols.com';
const TO = ['djbenjaminfranklin@gmail.com', 'johanna@dresscodepress.com'];
const TZ = 'Europe/Madrid';

const today = new Date().toLocaleDateString('sv-SE', { timeZone: TZ }); // YYYY-MM-DD (Madrid)
const eur = (n) => n.toFixed(2).replace('.', ',');
const dayOf = (d) => new Date(d).toLocaleDateString('sv-SE', { timeZone: TZ });

async function run() {
  // Tickets série W déclarés (résas + commandes)
  const { data: resas } = await sb.from('beach_reservations')
    .select('created_at, deposit_amount, agora_number').eq('agora_serie', 'W').not('agora_number', 'is', null);
  const { data: ords } = await sb.from('app_orders')
    .select('created_at, total, agora_number').eq('agora_serie', 'W').not('agora_number', 'is', null);

  const rToday = (resas || []).filter((r) => dayOf(r.created_at) === today);
  const oToday = (ords || []).filter((o) => dayOf(o.created_at) === today);
  const plage = rToday.reduce((a, r) => a + Number(r.deposit_amount || 0), 0);
  const cmd = oToday.reduce((a, o) => a + Number(o.total || 0), 0);
  const total = plage + cmd;
  const nb = rToday.length + oToday.length;

  const dLabel = new Date(today + 'T12:00:00Z').toLocaleDateString('fr-FR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });

  const html = `
  <div style="font-family:-apple-system,Arial,sans-serif;max-width:460px;margin:0 auto;color:#1a1a1a">
    <h2 style="color:#A3220B;margin:0 0 4px">Z de l'appli — ${dLabel}</h2>
    <p style="color:#8a8a8a;margin:0 0 16px;font-size:13px">Encaissements de l'application (série W)</p>
    <table style="width:100%;border-collapse:collapse;font-size:15px">
      <tr><td style="padding:7px 0;color:#555">Réservations plage</td><td style="text-align:right;font-weight:700">${eur(plage)} €<span style="color:#999;font-weight:400"> (${rToday.length})</span></td></tr>
      <tr><td style="padding:7px 0;color:#555">Commandes transat</td><td style="text-align:right;font-weight:700">${eur(cmd)} €<span style="color:#999;font-weight:400"> (${oToday.length})</span></td></tr>
      <tr><td style="padding:12px 0;border-top:2px solid #eee;font-weight:800">TOTAL APPLI</td><td style="padding:12px 0;border-top:2px solid #eee;text-align:right;font-weight:800;color:#A3220B;font-size:18px">${eur(total)} €</td></tr>
    </table>
    <p style="color:#8a8a8a;font-size:12px;margin-top:14px">${nb} ticket(s) série W. À additionner au Z de la caisse (série T) pour le CA total.</p>
  </div>`;

  await resend.emails.send({
    from: `La Plage Tournesol <${FROM}>`, to: TO,
    subject: `Z appli ${today} — ${eur(total)} €`,
    html,
  });
  console.log(`[${today}] Z appli envoyé par email: ${eur(total)} € (${nb} tickets)`);

  // Impression sur la caisse Agora (ticket "Z APPLI")
  const AGORA_URL = val('AGORA_URL');
  const AGORA_TOKEN = val('AGORA_TOKEN');
  const PRINTER = val('AGORA_PRINTER_BAR') || 'Tickets';
  if (AGORA_URL && AGORA_TOKEN) {
    const lines = [
      '', '   *** Z APPLI (serie W) ***', '========================',
      dLabel, '------------------------',
      `Reservations : ${eur(plage)} EUR (${rToday.length})`,
      `Commandes    : ${eur(cmd)} EUR (${oToday.length})`,
      '------------------------',
      `TOTAL APPLI  : ${eur(total)} EUR`,
      `${nb} ticket(s) serie W`,
      '========================',
      '(a ajouter au Z caisse serie T)', '', '',
    ];
    try {
      const r = await fetch(`${AGORA_URL}/api/print/`, {
        method: 'POST',
        headers: { 'Api-Token': AGORA_TOKEN, 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', Accept: 'application/json', 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ Format: 'plain', Data: lines.join('\n'), PrinterName: PRINTER }),
      });
      console.log(r.ok ? `[${today}] Z appli imprimé sur la caisse (${PRINTER})` : `[${today}] impression caisse échouée: HTTP ${r.status}`);
    } catch (e) {
      console.error(`[${today}] impression caisse erreur:`, e.message);
    }
  }
}
run().catch((e) => { console.error('ERREUR Z appli:', e.message); process.exit(1); });
