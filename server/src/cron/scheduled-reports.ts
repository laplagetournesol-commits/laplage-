// Tâches planifiées déplacées du Mac (launchd) vers le serveur Render (cloud, 24/7).
// - Synchro menu Agora (chaque nuit)
// - Z appli série W : email + impression caisse (chaque soir)
// - Rapport comptable Stripe (le 1er de chaque mois)
// Utilisent process.env (Render), donc aucun fichier .env requis.
import { Resend } from 'resend';
import Stripe from 'stripe';
import { supabase } from '../lib/supabase';
import { syncAgoraMenu } from '../lib/agora';

const FROM = `La Plage Tournesol <${process.env.RESEND_FROM_EMAIL ?? 'contact@laplagetournesols.com'}>`;
const TZ = 'Europe/Madrid';
const eur = (n: number) => n.toFixed(2).replace('.', ',');
const madridDay = (d: string | number | Date) => new Date(d).toLocaleDateString('sv-SE', { timeZone: TZ });

function resend() {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY manquante');
  return new Resend(process.env.RESEND_API_KEY);
}

// ---------- 1) SYNCHRO MENU ----------
export async function runMenuSync(): Promise<void> {
  const r = await syncAgoraMenu();
  console.log(`[Cron] Menu synchronisé : ${r.families} familles, ${r.items} articles`);
}

// ---------- 2) Z APPLI (série W) : email + impression caisse ----------
export async function runDailyCaReport(): Promise<void> {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
  const { data: resas } = await supabase.from('beach_reservations').select('created_at, deposit_amount, agora_number').eq('agora_serie', 'W').not('agora_number', 'is', null);
  const { data: ords } = await supabase.from('app_orders').select('created_at, total, agora_number').eq('agora_serie', 'W').not('agora_number', 'is', null);
  const rToday = (resas ?? []).filter((r: any) => madridDay(r.created_at) === today);
  const oToday = (ords ?? []).filter((o: any) => madridDay(o.created_at) === today);
  const plage = rToday.reduce((a: number, r: any) => a + Number(r.deposit_amount || 0), 0);
  const cmd = oToday.reduce((a: number, o: any) => a + Number(o.total || 0), 0);
  const total = plage + cmd;
  const nb = rToday.length + oToday.length;
  const dLabel = new Date(today + 'T12:00:00Z').toLocaleDateString('fr-FR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });

  // Email (Benjamin + Johanna)
  const html = `<div style="font-family:-apple-system,Arial,sans-serif;max-width:460px;margin:0 auto;color:#1a1a1a">
    <h2 style="color:#A3220B;margin:0 0 4px">Z de l'appli — ${dLabel}</h2>
    <p style="color:#8a8a8a;margin:0 0 16px;font-size:13px">Encaissements de l'application (série W)</p>
    <table style="width:100%;border-collapse:collapse;font-size:15px">
      <tr><td style="padding:7px 0;color:#555">Réservations plage</td><td style="text-align:right;font-weight:700">${eur(plage)} €<span style="color:#999;font-weight:400"> (${rToday.length})</span></td></tr>
      <tr><td style="padding:7px 0;color:#555">Commandes transat</td><td style="text-align:right;font-weight:700">${eur(cmd)} €<span style="color:#999;font-weight:400"> (${oToday.length})</span></td></tr>
      <tr><td style="padding:12px 0;border-top:2px solid #eee;font-weight:800">TOTAL APPLI</td><td style="padding:12px 0;border-top:2px solid #eee;text-align:right;font-weight:800;color:#A3220B;font-size:18px">${eur(total)} €</td></tr>
    </table>
    <p style="color:#8a8a8a;font-size:12px;margin-top:14px">${nb} ticket(s) série W. À additionner au Z de la caisse (série T).</p></div>`;
  try {
    await resend().emails.send({ from: FROM, to: ['djbenjaminfranklin@gmail.com', 'johanna@dresscodepress.com'], subject: `Z appli ${today} — ${eur(total)} €`, html });
  } catch (e: any) { console.error('[Cron] Z appli email échoué:', e.message); }

  // Impression caisse Agora
  const AGORA_URL = process.env.AGORA_URL ?? 'https://tournesols.eccicloud.es';
  const AGORA_TOKEN = process.env.AGORA_TOKEN;
  const PRINTER = process.env.AGORA_PRINTER_BAR ?? 'Tickets';
  if (AGORA_TOKEN) {
    const lines = ['', '   *** Z APPLI (serie W) ***', '========================', dLabel, '------------------------',
      `Reservations : ${eur(plage)} EUR (${rToday.length})`, `Commandes    : ${eur(cmd)} EUR (${oToday.length})`,
      '------------------------', `TOTAL APPLI  : ${eur(total)} EUR`, `${nb} ticket(s) serie W`, '========================', '', '', ''];
    try {
      const r = await fetch(`${AGORA_URL}/api/print/`, {
        method: 'POST',
        headers: { 'Api-Token': AGORA_TOKEN, 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', Accept: 'application/json', 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ Format: 'plain', Data: lines.join('\n'), PrinterName: PRINTER }),
      });
      console.log(r.ok ? `[Cron] Z appli imprimé (${PRINTER})` : `[Cron] impression caisse HTTP ${r.status}`);
    } catch (e: any) { console.error('[Cron] impression caisse erreur:', e.message); }
  }
  console.log(`[Cron] Z appli ${today} : ${eur(total)} € (${nb} tickets)`);
}

// ---------- 3) RAPPORT COMPTABLE (Stripe, mois précédent) ----------
export async function runMonthlyAccountantReport(): Promise<void> {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  const TO = 'ljimenez@marbellafiscal.com', CC = 'djbenjaminfranklin@gmail.com';
  const now = new Date();
  let y = now.getUTCFullYear(), m = now.getUTCMonth() - 1;
  if (m < 0) { m = 11; y -= 1; }
  const monthPrefix = `${y}-${String(m + 1).padStart(2, '0')}`;
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const mesLabel = `${MESES[m]} ${y}`;
  const gte = Math.floor(Date.parse(`${monthPrefix}-01T00:00:00Z`) / 1000) - 2 * 86400;
  const lte = Math.floor(Date.UTC(y, m + 1, 1) / 1000) + 2 * 86400;
  const time = (u: number) => new Date(u * 1000).toLocaleTimeString('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
  const KEEP = new Set(['charge', 'payment', 'refund', 'payment_refund', 'payment_failure_refund']);
  const TIPO: Record<string, string> = { charge: 'Venta', payment: 'Venta', refund: 'Reembolso', payment_refund: 'Reembolso', payment_failure_refund: 'Reembolso' };

  const rows: any[] = [];
  let hasMore = true, starting_after: string | undefined;
  while (hasMore) {
    const page: any = await stripe.balanceTransactions.list({ limit: 100, created: { gte, lte }, ...(starting_after ? { starting_after } : {}) });
    for (const bt of page.data) {
      if (!KEEP.has(bt.type)) continue;
      const d = madridDay(bt.created * 1000);
      if (!d.startsWith(monthPrefix)) continue;
      rows.push({ unix: bt.created, date: d, time: time(bt.created), id: bt.source || bt.id, tipo: TIPO[bt.type] || bt.type, desc: (bt.description || '').replace(/[\n\r;]+/g, ' ').slice(0, 80), gross: bt.amount, fee: bt.fee, net: bt.net });
    }
    hasMore = page.has_more;
    if (hasMore) starting_after = page.data[page.data.length - 1].id;
  }
  rows.sort((a, b) => a.unix - b.unix);

  const out = ['Fecha;Hora;ID;Tipo;Descripción;Bruto (€);Comisión Stripe (€);Neto (€)'];
  let curDay: string | null = null, dG = 0, dF = 0, dN = 0, dC = 0, tG = 0, tF = 0, tN = 0;
  const flush = () => { if (curDay) out.push(`;;;SUBTOTAL ${curDay};${dC} op.;${eur(dG / 100)};${eur(dF / 100)};${eur(dN / 100)}`); };
  for (const r of rows) {
    if (r.date !== curDay) { flush(); curDay = r.date; dG = dF = dN = dC = 0; }
    out.push(`${r.date};${r.time};${r.id};${r.tipo};${r.desc};${eur(r.gross / 100)};${eur(r.fee / 100)};${eur(r.net / 100)}`);
    dG += r.gross; dF += r.fee; dN += r.net; dC++; tG += r.gross; tF += r.fee; tN += r.net;
  }
  flush();
  out.push('', `;;;;TOTAL ${mesLabel};${rows.length} op.;${eur(tG / 100)};${eur(tF / 100)};${eur(tN / 100)}`);
  const csv = '﻿' + out.join('\n');

  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.6">
    <p>Estimado Luis,</p>
    <p>Le adjunto el <strong>detalle diario de los cobros Stripe</strong> de la aplicación <strong>La Plage Tournesol</strong> correspondiente a <strong>${mesLabel}</strong>.</p>
    <p style="background:#f5f2ea;border-radius:8px;padding:12px 14px"><strong>Total ${mesLabel}:</strong> Bruto ${eur(tG / 100)} € · Comisiones ${eur(tF / 100)} € · Neto ${eur(tN / 100)} € · ${rows.length} operaciones</p>
    <p>Un cordial saludo,<br>Benjamin Taieb<br>La Plage Tournesol</p></div>`;
  await resend().emails.send({
    from: FROM, to: TO, cc: CC, reply_to: CC,
    subject: `La Plage Tournesol — Detalle diario de cobros Stripe · ${mesLabel}`,
    html, attachments: [{ filename: `stripe-detalle-${monthPrefix}.csv`, content: Buffer.from(csv, 'utf8').toString('base64') }],
  } as any);
  console.log(`[Cron] Rapport comptable ${mesLabel} envoyé (${rows.length} op., neto ${eur(tN / 100)} €)`);
}
