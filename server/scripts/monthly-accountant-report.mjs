// Rapport comptable mensuel — envoyé le 1er de chaque mois (launchd).
// Génère le détail journalier Stripe du MOIS PRÉCÉDENT et l'envoie au comptable via Resend.
// WorkingDirectory attendu : .../tournesol/server
import fs from 'fs';
import path from 'path';
import Stripe from 'stripe';
import { Resend } from 'resend';

// --- env (server/.env) ---
const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const val = (k) => (env.match(new RegExp(`${k}=(.+)`)) || [])[1]?.trim();
const stripe = new Stripe(val('STRIPE_SECRET_KEY'));
const resend = new Resend(val('RESEND_API_KEY'));
const FROM = val('RESEND_FROM_EMAIL') || 'contact@laplagetournesols.com';

const TO = 'ljimenez@marbellafiscal.com';
const CC = 'djbenjaminfranklin@gmail.com';
const TZ = 'Europe/Madrid';
const stamp = () => new Date().toISOString();

// --- mois précédent ---
const now = new Date();
let y = now.getUTCFullYear(), m = now.getUTCMonth(); // m = mois courant (0-11)
m -= 1; if (m < 0) { m = 11; y -= 1; }               // mois précédent
const monthPrefix = `${y}-${String(m + 1).padStart(2, '0')}`;
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const mesLabel = `${MESES[m]} ${y}`;

// fenêtre unix large (marge 2j) puis filtre par date locale Madrid
const gte = Math.floor(Date.parse(`${monthPrefix}-01T00:00:00Z`) / 1000) - 2 * 86400;
const lte = Math.floor(Date.UTC(y, m + 1, 1) / 1000) + 2 * 86400;

const madridDate = (u) => new Date(u * 1000).toLocaleDateString('sv-SE', { timeZone: TZ });
const madridTime = (u) => new Date(u * 1000).toLocaleTimeString('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const eur = (c) => (c / 100).toFixed(2).replace('.', ',');
const KEEP = new Set(['charge', 'payment', 'refund', 'payment_refund', 'payment_failure_refund']);
const TIPO = { charge: 'Venta', payment: 'Venta', refund: 'Reembolso', payment_refund: 'Reembolso', payment_failure_refund: 'Reembolso' };

async function run() {
  const rows = [];
  let hasMore = true, starting_after;
  while (hasMore) {
    const page = await stripe.balanceTransactions.list({ limit: 100, created: { gte, lte }, ...(starting_after ? { starting_after } : {}) });
    for (const bt of page.data) {
      if (!KEEP.has(bt.type)) continue;
      const d = madridDate(bt.created);
      if (!d.startsWith(monthPrefix)) continue;
      rows.push({ unix: bt.created, date: d, time: madridTime(bt.created), id: bt.source || bt.id, tipo: TIPO[bt.type] || bt.type, desc: (bt.description || '').replace(/[\n\r;]+/g, ' ').slice(0, 80), gross: bt.amount, fee: bt.fee, net: bt.net });
    }
    hasMore = page.has_more;
    if (hasMore) starting_after = page.data[page.data.length - 1].id;
  }
  rows.sort((a, b) => a.unix - b.unix);

  const out = ['Fecha;Hora;ID;Tipo;Descripción;Bruto (€);Comisión Stripe (€);Neto (€)'];
  let curDay = null, dG = 0, dF = 0, dN = 0, dC = 0, tG = 0, tF = 0, tN = 0;
  const flush = () => { if (curDay) out.push(`;;;SUBTOTAL ${curDay};${dC} op.;${eur(dG)};${eur(dF)};${eur(dN)}`); };
  for (const r of rows) {
    if (r.date !== curDay) { flush(); curDay = r.date; dG = dF = dN = dC = 0; }
    out.push(`${r.date};${r.time};${r.id};${r.tipo};${r.desc};${eur(r.gross)};${eur(r.fee)};${eur(r.net)}`);
    dG += r.gross; dF += r.fee; dN += r.net; dC++; tG += r.gross; tF += r.fee; tN += r.net;
  }
  flush();
  out.push('');
  out.push(`;;;;TOTAL ${mesLabel};${rows.length} op.;${eur(tG)};${eur(tF)};${eur(tN)}`);
  const csv = '﻿' + out.join('\n');
  const filename = `stripe-detalle-${monthPrefix}.csv`;

  const html = `
  <div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.6">
    <p>Estimado Luis,</p>
    <p>Le adjunto el <strong>detalle diario de los cobros Stripe</strong> de la aplicación
    <strong>La Plage Tournesol</strong> correspondiente a <strong>${mesLabel}</strong>.</p>
    <p style="background:#f5f2ea;border-radius:8px;padding:12px 14px">
      <strong>Total ${mesLabel}:</strong> Bruto ${eur(tG)} € · Comisiones Stripe ${eur(tF)} € ·
      Neto ${eur(tN)} € · ${rows.length} operaciones</p>
    <p>El archivo CSV adjunto contiene el detalle día por día (ventas y reembolsos) con los
    subtotales diarios y el total del mes.</p>
    <p>Un cordial saludo,<br>Benjamin Taieb<br>La Plage Tournesol</p>
  </div>`;

  if (process.env.DRY_RUN === '1') {
    console.log(`[DRY_RUN] ${mesLabel}: ${rows.length} op., bruto ${eur(tG)} €, comisiones ${eur(tF)} €, neto ${eur(tN)} € — email NON envoyé`);
    return;
  }
  const { data, error } = await resend.emails.send({
    from: `La Plage Tournesol <${FROM}>`, to: TO, cc: CC, reply_to: CC,
    subject: `La Plage Tournesol — Detalle diario de cobros Stripe · ${mesLabel}`,
    html, attachments: [{ filename, content: Buffer.from(csv, 'utf8').toString('base64') }],
  });
  if (error) throw new Error(JSON.stringify(error));
  console.log(`[${stamp()}] Rapport ${mesLabel} envoyé (${rows.length} op., neto ${eur(tN)} €) id=${data?.id}`);
}

run().catch((e) => { console.error(`[${stamp()}] ERREUR rapport mensuel:`, e.message); process.exit(1); });
