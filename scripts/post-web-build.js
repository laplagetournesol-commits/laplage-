#!/usr/bin/env node
/**
 * Post-build pour le bundle web.
 *
 * 1. Vercel refuse de servir tout chemin contenant `node_modules`. On renomme
 *    `dist/assets/node_modules` -> `dist/assets/_vendor` et on remplace toutes
 *    les références dans les bundles JS.
 * 2. Ajuste le CSS du <body> pour permettre le scroll.
 */
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');

function patchIndexHtml() {
  const indexPath = path.join(DIST, 'index.html');
  if (!fs.existsSync(indexPath)) return;
  let html = fs.readFileSync(indexPath, 'utf8');

  // 1. CSS flex fix (Firefox)
  html = html.replace(
    'overflow: hidden;',
    'overflow: hidden;\n        display: flex;\n        flex-direction: column;'
  );

  // 2. SEO injection
  const SITE_URL = 'https://laplagetournesols.com';
  const OG_IMAGE = `${SITE_URL}/assets/og-image.jpg`;
  const TITLE = 'La Plage Tournesol — Beach Club & Restaurant à Estepona';
  const DESC = 'Beach club et restaurant de plage à Estepona, Costa del Sol. Réservez votre transat, une table au restaurant ou vos billets pour nos soirées DJ en ligne. Paiement sécurisé.';

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'Restaurant'],
    name: 'La Plage Tournesol',
    description: 'Beach club et restaurant de plage à Estepona, Costa del Sol. Location de transats, restaurant, soirées DJ et pool parties.',
    url: SITE_URL,
    image: OG_IMAGE,
    priceRange: '€€',
    servesCuisine: ['Mediterranean', 'Seafood'],
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Avenida del Litoral',
      addressLocality: 'Estepona',
      addressRegion: 'Málaga',
      addressCountry: 'ES',
    },
  });

  const seoBlock = `    <title>${TITLE}</title>
    <meta name="description" content="${DESC}" />
    <link rel="canonical" href="${SITE_URL}/" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${SITE_URL}/" />
    <meta property="og:title" content="${TITLE}" />
    <meta property="og:description" content="${DESC}" />
    <meta property="og:image" content="${OG_IMAGE}" />
    <meta property="og:locale" content="fr_FR" />
    <meta property="og:locale:alternate" content="es_ES" />
    <meta property="og:locale:alternate" content="en_US" />
    <meta property="og:site_name" content="La Plage Tournesol" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${TITLE}" />
    <meta name="twitter:description" content="${DESC}" />
    <meta name="twitter:image" content="${OG_IMAGE}" />
    <script type="application/ld+json">${jsonLd}</script>`;

  // lang="en" → "fr"
  html = html.replace('<html lang="en">', '<html lang="fr">');
  // Remplace le titre par défaut + injecte tout le bloc SEO
  html = html.replace(
    /<title>[^<]*<\/title>/,
    seoBlock,
  );

  // 3. Contenu HTML crawlable injecté DANS #root (remplacé par React au mount).
  //    Googlebot lit ce contenu en static HTML (premier passage).
  //    Les utilisateurs voient le SPA dès que React monte (~100-300ms).
  const seoBody = `
    <div id="seo-content" style="max-width:900px;margin:0 auto;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#2c3e50;line-height:1.6;">
      <header style="text-align:center;margin-bottom:32px;">
        <h1 style="font-size:28px;color:#C4943D;margin:0 0 12px;">La Plage Tournesol — Beach Club &amp; Restaurant à Estepona</h1>
        <p style="font-size:16px;color:#555;">Location de transats, BEDs, restaurant méditerranéen et soirées DJ sur la plage d'Estepona, Costa del Sol.</p>
      </header>
      <main>
        <section>
          <h2>Réservation de transats à Estepona</h2>
          <p>Réservez votre transat, chaise longue ou BED (transat double avec bouteille de cava en option) depuis notre application. Six rangées disponibles, de la première ligne face à la mer jusqu'aux chaises longues près du club.</p>
          <ul>
            <li>Chaise longue : 12 €</li>
            <li>Transat standard / parasol / 1ère ligne : 25 €</li>
            <li>BED (transat double) : 70 € — option bouteille de cava : 80 €</li>
          </ul>
        </section>
        <section>
          <h2>Restaurant de plage à Estepona</h2>
          <p>Cuisine méditerranéenne et de la mer, service le midi et le soir. Réservation en ligne avec empreinte CB de 20 € par personne. Vue mer et terrasse.</p>
        </section>
        <section>
          <h2>Soirées DJ &amp; pool parties</h2>
          <p>Programme régulier d'événements : DJ sets, pool parties et soirées thématiques en haute saison. Billetterie et programme dans l'application.</p>
        </section>
        <section>
          <h2>Informations pratiques</h2>
          <address style="font-style:normal;">
            <strong>La Plage Tournesol</strong><br/>
            Avenida del Litoral<br/>
            29680 Estepona, Málaga, Espagne
          </address>
          <p>Ouvert tous les jours en saison. Réservation conseillée le week-end et en haute saison.</p>
        </section>
        <p style="text-align:center;margin-top:32px;color:#888;font-size:14px;">Chargement de l'application…</p>
      </main>
    </div>`;

  html = html.replace('<div id="root"></div>', `<div id="root">${seoBody}</div>`);

  fs.writeFileSync(indexPath, html);
  console.log('[post-build] index.html patched (CSS + SEO + crawlable content)');
}

function renameVendorDir() {
  const oldDir = path.join(DIST, 'assets', 'node_modules');
  const newDir = path.join(DIST, 'assets', '_vendor');
  if (fs.existsSync(newDir)) {
    fs.rmSync(newDir, { recursive: true, force: true });
  }
  if (fs.existsSync(oldDir)) {
    fs.renameSync(oldDir, newDir);
    console.log('[post-build] dist/assets/node_modules → dist/assets/_vendor');
  }
}

function patchBundles() {
  const jsDir = path.join(DIST, '_expo', 'static', 'js', 'web');
  if (!fs.existsSync(jsDir)) return;
  const files = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js'));
  for (const file of files) {
    const full = path.join(jsDir, file);
    const content = fs.readFileSync(full, 'utf8');
    if (!content.includes('assets/node_modules')) continue;
    const patched = content.split('assets/node_modules').join('assets/_vendor');
    fs.writeFileSync(full, patched);
    console.log(`[post-build] patched ${file}`);
  }
}

patchIndexHtml();
renameVendorDir();
patchBundles();
console.log('[post-build] done');
