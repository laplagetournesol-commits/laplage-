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

  fs.writeFileSync(indexPath, html);
  console.log('[post-build] index.html patched (CSS + SEO)');
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
