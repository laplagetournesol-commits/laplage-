// Synchro automatique du menu depuis Agora — chaque nuit (launchd).
// Réplique fidèle de syncAgoraMenu : upsert familles + articles SANS toucher `enabled`
// (les nouveaux arrivent désactivés, tes activations sont préservées).
// WorkingDirectory attendu : .../tournesol/server
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const val = (k) => (env.match(new RegExp(`${k}=(.+)`)) || [])[1]?.trim();
const sb = createClient(val('SUPABASE_URL'), val('SUPABASE_SERVICE_ROLE_KEY'));
const AGORA_URL = val('AGORA_URL'), AGORA_TOKEN = val('AGORA_TOKEN');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)';
const VAT_RATE_BY_ID = { 1: 0, 2: 0.04, 3: 0.1, 4: 0.21 };
const PREP_BY_ID = { 1: 'BARRA', 2: 'COCINA' };
const stamp = () => new Date().toISOString();

async function run() {
  if (!AGORA_TOKEN) throw new Error('AGORA_TOKEN non configuré');
  const res = await fetch(`${AGORA_URL}/api/export-master/?filter=Products,Families`, {
    headers: { 'Api-Token': AGORA_TOKEN, 'User-Agent': UA, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Ágora HTTP ${res.status}`);
  const data = await res.json();
  const families = data.Families ?? [];
  const products = data.Products ?? [];

  const famRows = families.map((f, i) => ({ family_id: f.Id, name: f.Name, sort_order: i, synced_at: stamp() }));
  if (famRows.length) {
    const { error } = await sb.from('app_menu_families').upsert(famRows, { onConflict: 'family_id' });
    if (error) throw new Error(`upsert families: ${error.message}`);
  }

  const famNameById = Object.fromEntries(families.map((f) => [f.Id, f.Name]));
  const itemRows = products
    .filter((p) => p.SaleableAsMain !== false && p.FamilyId != null)
    .map((p) => ({
      product_id: p.Id,
      sale_format_id: p.BaseSaleFormatId ?? null,
      name: p.Name,
      price: Number(p.Prices?.[0]?.MainPrice ?? 0),
      vat_id: p.VatId ?? null,
      vat_rate: p.VatId != null ? VAT_RATE_BY_ID[p.VatId] ?? null : null,
      family_id: p.FamilyId,
      family_name: famNameById[p.FamilyId] ?? null,
      prep_type: p.PreparationTypeId != null ? PREP_BY_ID[p.PreparationTypeId] ?? null : null,
      prep_order_id: p.PreparationOrderId ?? null,
      saleable: p.SaleableAsMain !== false,
      synced_at: stamp(),
    }));
  for (let i = 0; i < itemRows.length; i += 200) {
    const { error } = await sb.from('app_menu_items').upsert(itemRows.slice(i, i + 200), { onConflict: 'product_id' });
    if (error) throw new Error(`upsert items: ${error.message}`);
  }
  console.log(`[${stamp()}] Menu synchronisé : ${famRows.length} familles, ${itemRows.length} articles`);
}
run().catch((e) => { console.error(`[${stamp()}] ERREUR synchro menu:`, e.message); process.exit(1); });
