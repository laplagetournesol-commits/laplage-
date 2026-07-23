import { supabase } from './supabase';

/**
 * Intégration caisse Ágora (déclaration fiscale ES).
 * Chaque vente plage payée via Stripe est injectée comme facture simplifiée
 * sur la série "W" (ventes internet/app), sans jamais toucher la série "T"
 * (ventes plage en direct). Les remboursements deviennent des avoirs série "WD".
 *
 * Tout est derrière AGORA_SYNC_ENABLED (OFF par défaut) : rien ne part vers
 * Ágora tant que ce flag n'est pas activé.
 */

const AGORA_URL = process.env.AGORA_URL ?? 'https://tournesols.eccicloud.es';
const AGORA_TOKEN = process.env.AGORA_TOKEN ?? '';
const AGORA_ENABLED = process.env.AGORA_SYNC_ENABLED === 'true';
// Bon imprimé "RESERVA APP" à la plage (séparé du fiscal). Off par défaut ;
// AGORA_PRINTER_NAME = nom Windows de l'imprimante plage (vide = imprimante par défaut).
const AGORA_PRINT_ENABLED = process.env.AGORA_PRINT_ENABLED === 'true';
const AGORA_PRINTER_NAME = process.env.AGORA_PRINTER_NAME ?? '';

// Constantes de config Ágora (découvertes via l'API export-master)
const POS = { Id: 1, Name: 'TPV1' };
const WORKPLACE = { Id: 1, Name: 'LES TOURNESOLS' };
const USER = { Id: 18, Name: 'TOURNESOLS-APP' }; // utilisateur dédié app
const SALECENTER_PLAYA = { Id: 4, Name: 'PLAYA' };
const HAMACA = { ProductId: 216, SaleFormatId: 226, Name: '1 HAMACA', FamilyId: 24, FamilyName: 'HAMACAS' };
const VAT = { VatId: 3, VatRate: 0.1, SurchargeRate: 0.014 }; // Reducido 10%
const PAYMENT_METHOD = { Id: 2, Name: 'TARJETA' }; // Stripe = carte
const SERIE_SALE = 'W';
const SERIE_REFUND = 'WD';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'; // Cloudflare bloque les UA non-navigateur

const round2 = (n: number) => Math.round(n * 100) / 100;

function agoraConfigured(): boolean {
  return AGORA_ENABLED && !!AGORA_TOKEN;
}

async function agoraImport(payload: unknown): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetch(`${AGORA_URL}/api/import/`, {
    method: 'POST',
    headers: {
      'Api-Token': AGORA_TOKEN,
      'User-Agent': UA,
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(payload),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

/** Numéro suivant de la série (compteur atomique côté Postgres, sans trou). */
async function nextNumber(serie: string): Promise<number> {
  const { data, error } = await supabase.rpc('next_agora_number', { p_serie: serie });
  if (error) throw new Error(`next_agora_number(${serie}): ${error.message}`);
  return data as number;
}

/** Prix d'un transat, même logique que l'app/serveur (bed=70, sinon saisonnier). */
function priceOfSunbed(
  sb: { is_double: boolean; zone: { zone_type?: string; base_price?: number } },
  seasonRows: Array<{ pricing_category: string; fixed_price: number }>,
): number {
  if (sb.is_double) return 70;
  const zt = sb.zone?.zone_type;
  const cat =
    zt === 'front_row' ? 'transat_front_row' : zt === 'vip_cabana' ? 'bed' : zt === 'chaise_longue' ? 'chaise_longue' : 'transat';
  const row = seasonRows.find((r) => r.pricing_category === cat);
  return row ? Number(row.fixed_price) : Number(sb.zone?.base_price ?? 20);
}

/** Bloc Totals (TVA incluse 10%) à partir d'un montant brut. */
function totalsFor(gross: number, sign = 1) {
  const g = round2(sign * gross);
  const net = round2(g / (1 + VAT.VatRate));
  const vat = round2(g - net);
  return {
    GrossAmount: g,
    NetAmount: net,
    VatAmount: vat,
    SurchargeAmount: 0.0,
    Taxes: [{ VatRate: VAT.VatRate, SurchargeRate: VAT.SurchargeRate, GrossAmount: g, NetAmount: net, VatAmount: vat, SurchargeAmount: 0.0 }],
  };
}

interface BeachLine { label: string; price: number }

function buildInvoice(opts: {
  serie: string;
  number: number;
  date: string; // ISO
  businessDay: string; // YYYY-MM-DD
  location: string;
  lines: BeachLine[];
  paidAmount: number;
  piId: string;
  refundOf?: { serie: string; number: number };
}) {
  const sign = opts.refundOf ? -1 : 1;
  const gross = opts.lines.reduce((s, l) => s + l.price, 0);
  const totals = totalsFor(gross, sign);
  const invLines = opts.lines.map((l, i) => ({
    Index: i,
    CreationDate: opts.date,
    Type: 'Standard',
    ParentIndex: null,
    ProductId: HAMACA.ProductId,
    ProductName: HAMACA.Name,
    SaleFormatId: HAMACA.SaleFormatId,
    SaleFormatName: HAMACA.Name,
    SaleFormatRatio: 1.0,
    MainBarcode: '',
    ProductPrice: round2(l.price),
    VatId: VAT.VatId,
    VatRate: VAT.VatRate,
    SurchargeRate: VAT.SurchargeRate,
    ProductCostPrice: 0.0,
    MenuGroup: '',
    PreparationTypeId: null,
    PreparationTypeName: '',
    PLU: '',
    FamilyId: HAMACA.FamilyId,
    FamilyName: HAMACA.FamilyName,
    PreparationOrderId: null,
    PreparationOrderName: '',
    Quantity: sign * 1.0,
    UnitCostPrice: 0.0,
    TotalCostPrice: 0.0,
    UserId: USER.Id,
    UnitPrice: round2(l.price),
    DiscountRate: 0.0,
    CashDiscount: 0.0,
    OfferId: null,
    OfferCode: '',
    TotalAmount: round2(sign * l.price),
    PriceListId: 1,
  }));

  const invoice: Record<string, unknown> = {
    Serie: opts.serie,
    Number: opts.number,
    BusinessDay: opts.businessDay,
    VatIncluded: true,
    PrintCount: 1,
    Date: opts.date,
    Pos: POS,
    Workplace: WORKPLACE,
    User: USER,
    DocumentType: opts.refundOf ? 'BasicRefund' : 'BasicInvoice',
    FixTotalToPayments: true,
    InvoiceItems: [
      {
        ContentType: 'T',
        Pos: POS,
        User: USER,
        BusinessDay: opts.businessDay,
        Date: opts.date,
        SaleCenter: { ...SALECENTER_PLAYA, Location: opts.location },
        VatIncluded: true,
        Lines: invLines,
        Discounts: { DiscountRate: 0.0, CashDiscount: 0.0 },
        Payments: [],
        Offers: [],
        Totals: totals,
      },
    ],
    Payments: [
      {
        MethodId: PAYMENT_METHOD.Id,
        MethodName: PAYMENT_METHOD.Name,
        Amount: round2(sign * opts.paidAmount),
        PaidAmount: round2(sign * opts.paidAmount),
        ChangeAmount: 0.0,
        TipAmount: 0.0,
        Date: opts.date,
        PosId: POS.Id,
        IsPrepayment: false,
        ExtraInformation: `VENTA APP - Stripe ${opts.piId}`,
      },
    ],
    Totals: totals,
  };
  if (opts.refundOf) {
    invoice.RelatedInvoice = { Serie: opts.refundOf.serie, Number: opts.refundOf.number };
    invoice.RefundSource = 'Reopen';
  }
  return { Invoices: [invoice] };
}

async function loadBeachLines(reservationId: string): Promise<{ lines: BeachLine[]; date: string; total: number } | null> {
  const { data: resa } = await supabase
    .from('beach_reservations')
    .select('id, date, total_price')
    .eq('id', reservationId)
    .single();
  if (!resa) return null;

  const { data: links } = await supabase
    .from('beach_reservation_sunbeds')
    .select('sunbed_id')
    .eq('reservation_id', reservationId);
  const ids = (links ?? []).map((l) => l.sunbed_id);
  if (ids.length === 0) return null;

  const { data: sunbeds } = await supabase
    .from('sunbeds')
    .select('id, label, is_double, zone:beach_zones(zone_type, base_price)')
    .in('id', ids);
  const { data: seasonRows } = await supabase
    .from('seasonal_pricing')
    .select('pricing_category, fixed_price')
    .lte('start_date', resa.date)
    .gte('end_date', resa.date);

  const lines: BeachLine[] = (sunbeds ?? []).map((sb: any) => ({
    label: sb.label ?? '',
    price: priceOfSunbed(sb, (seasonRows ?? []) as any),
  }));
  return { lines, date: resa.date, total: Number(resa.total_price) };
}

/**
 * Imprime un bon "RESERVA APP" à la plage pour que les serveurs (qui regardent
 * la caisse) sachent quel transat est réservé par l'app et pour qui. Séparé du
 * fiscal, sans effet tant que AGORA_PRINT_ENABLED n'est pas activé.
 */
export async function printReservaSlip(reservationId: string): Promise<void> {
  if (!AGORA_PRINT_ENABLED || !AGORA_TOKEN) return;
  try {
    const { data: resa } = await supabase
      .from('beach_reservations')
      .select('id, date, guest_count, guest_name, total_price, user_id')
      .eq('id', reservationId)
      .single();
    if (!resa) return;

    let name = resa.guest_name?.trim() || '';
    if (!name && resa.user_id) {
      const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', resa.user_id).single();
      name = prof?.full_name?.trim() || '';
    }

    const { data: links } = await supabase
      .from('beach_reservation_sunbeds')
      .select('sunbed_id')
      .eq('reservation_id', reservationId);
    const ids = (links ?? []).map((l) => l.sunbed_id);
    const { data: sunbeds } = await supabase.from('sunbeds').select('label').in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
    const labels = (sunbeds ?? []).map((s: any) => s.label).filter(Boolean).join(', ') || '?';

    const lines = [
      '',
      '     *** RESERVA APP ***',
      '========================',
      `Transat(s): ${labels}`,
      `Cliente:    ${name || '-'}`,
      `Fecha:      ${resa.date}`,
      `Personas:   ${resa.guest_count ?? '-'}`,
      `Pagado:     ${resa.total_price}EUR (Stripe)`,
      '========================',
      'Reservado desde la app',
      '',
      '',
    ];

    const body: Record<string, unknown> = { Format: 'plain', Data: lines.join('\n') };
    if (AGORA_PRINTER_NAME) body.PrinterName = AGORA_PRINTER_NAME;

    const res = await fetch(`${AGORA_URL}/api/print/`, {
      method: 'POST',
      headers: { 'Api-Token': AGORA_TOKEN, 'User-Agent': UA, Accept: 'application/json', 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.error(`[agora] échec impression bon résa ${reservationId}: HTTP ${res.status} ${await res.text()}`);
    else console.log(`[agora] bon RESERVA APP imprimé (résa ${reservationId}, transats ${labels})`);
  } catch (err: any) {
    console.error(`[agora] erreur impression résa ${reservationId}:`, err?.message ?? err);
  }
}

/**
 * Injecte la vente plage dans Ágora (facture série W). Idempotent : si la résa
 * a déjà un numéro Ágora, on ne refait rien. Ne throw jamais vers l'appelant
 * (le paiement Stripe ne doit pas échouer si Ágora est indisponible) — log seulement.
 */
export async function syncBeachSaleToAgora(reservationId: string, paymentIntentId: string, paidAmountCents: number): Promise<void> {
  if (!agoraConfigured()) return;
  try {
    // Idempotence
    const { data: existing } = await supabase
      .from('beach_reservations')
      .select('agora_serie, agora_number')
      .eq('id', reservationId)
      .single();
    if (existing?.agora_number) {
      console.log(`[agora] résa ${reservationId} déjà déclarée (${existing.agora_serie}-${existing.agora_number})`);
      return;
    }

    const data = await loadBeachLines(reservationId);
    if (!data || data.lines.length === 0) {
      console.warn(`[agora] pas de lignes pour la résa ${reservationId}, on saute`);
      return;
    }

    const paidAmount = round2(paidAmountCents / 100);
    const number = await nextNumber(SERIE_SALE);
    const now = new Date();
    const iso = now.toISOString().slice(0, 19);
    const businessDay = data.date; // jour de la réservation
    const location = data.lines.map((l) => l.label).filter(Boolean).join(', ') || 'APP';

    const payload = buildInvoice({
      serie: SERIE_SALE,
      number,
      date: iso,
      businessDay,
      location,
      lines: data.lines,
      paidAmount,
      piId: paymentIntentId,
    });

    const r = await agoraImport(payload);
    if (!r.ok) {
      console.error(`[agora] échec import vente ${SERIE_SALE}-${number} (résa ${reservationId}): HTTP ${r.status} ${r.body}`);
      return;
    }
    await supabase
      .from('beach_reservations')
      .update({ agora_serie: SERIE_SALE, agora_number: number, agora_synced_at: now.toISOString() })
      .eq('id', reservationId);
    console.log(`[agora] vente déclarée ${SERIE_SALE}-${number} (résa ${reservationId}, ${paidAmount}€)`);
  } catch (err: any) {
    console.error(`[agora] erreur syncBeachSale ${reservationId}:`, err?.message ?? err);
  }
}

/**
 * Crée l'avoir (série WD) correspondant à un remboursement Stripe d'une résa
 * plage déjà déclarée. refundAmountCents = montant remboursé (positif).
 */
export async function syncBeachRefundToAgora(reservationId: string, paymentIntentId: string, refundAmountCents: number): Promise<void> {
  if (!agoraConfigured()) return;
  try {
    const { data: resa } = await supabase
      .from('beach_reservations')
      .select('agora_serie, agora_number, date')
      .eq('id', reservationId)
      .single();
    if (!resa?.agora_number) {
      console.warn(`[agora] remboursement résa ${reservationId} : pas de facture Ágora d'origine, on saute`);
      return;
    }

    const refundAmount = round2(refundAmountCents / 100);
    const number = await nextNumber(SERIE_REFUND);
    const now = new Date();
    const iso = now.toISOString().slice(0, 19);

    // Avoir : une seule ligne HAMACA au montant remboursé (10% TVA incluse).
    const payload = buildInvoice({
      serie: SERIE_REFUND,
      number,
      date: iso,
      businessDay: now.toISOString().slice(0, 10),
      location: 'APP',
      lines: [{ label: 'APP', price: refundAmount }],
      paidAmount: refundAmount,
      piId: paymentIntentId,
      refundOf: { serie: resa.agora_serie, number: resa.agora_number },
    });

    const r = await agoraImport(payload);
    if (!r.ok) {
      console.error(`[agora] échec import avoir ${SERIE_REFUND}-${number} (résa ${reservationId}): HTTP ${r.status} ${r.body}`);
      return;
    }
    console.log(`[agora] avoir déclaré ${SERIE_REFUND}-${number} (résa ${reservationId}, -${refundAmount}€)`);
  } catch (err: any) {
    console.error(`[agora] erreur syncBeachRefund ${reservationId}:`, err?.message ?? err);
  }
}
