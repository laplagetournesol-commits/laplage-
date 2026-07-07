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
    '@type': ['LocalBusiness', 'Restaurant', 'BeachResort'],
    name: 'La Plage Tournesol',
    alternateName: ['Plage Tournesol', 'Tournesol Beach Club'],
    description: 'Beach club et restaurant de plage à Estepona, Costa del Sol. Location de transats, BEDs, chaises longues, restaurant méditerranéen, soirées DJ et pool parties. Réservation en ligne avec paiement sécurisé.',
    url: SITE_URL,
    image: OG_IMAGE,
    priceRange: '€€',
    servesCuisine: ['Mediterranean', 'Seafood', 'Tapas'],
    paymentAccepted: ['Cash', 'Credit Card', 'Stripe'],
    currenciesAccepted: 'EUR',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Avenida del Litoral',
      addressLocality: 'Estepona',
      addressRegion: 'Málaga',
      postalCode: '29680',
      addressCountry: 'ES',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 36.4231,
      longitude: -5.1438,
    },
    openingHoursSpecification: [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
      opens: '10:00',
      closes: '23:00',
    }],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Locations plage',
      itemListElement: [
        { '@type': 'Offer', name: 'Chaise longue', price: '12', priceCurrency: 'EUR' },
        { '@type': 'Offer', name: 'Transat parasol', price: '25', priceCurrency: 'EUR' },
        { '@type': 'Offer', name: 'Transat 1ère ligne face à la mer', price: '25', priceCurrency: 'EUR' },
        { '@type': 'Offer', name: 'BED (transat double)', price: '70', priceCurrency: 'EUR' },
        { '@type': 'Offer', name: 'BED + bouteille de cava', price: '80', priceCurrency: 'EUR' },
      ],
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

  // 3. Landing page complète injectée DANS #root (remplacée par React au mount).
  //    Googlebot indexe ce contenu en HTML statique au premier passage.
  //    Les utilisateurs voient cette page comme écran de chargement (~100-300ms)
  //    avant que React prenne le relais.
  const landingCss = `
    .lp-wrap{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2c3e50;line-height:1.65;background:linear-gradient(180deg,#fdf8f0 0%,#fff 600px);min-height:100vh;}
    .lp-container{max-width:980px;margin:0 auto;padding:32px 20px 64px;}
    .lp-hero{text-align:center;padding:48px 0 32px;border-bottom:1px solid #f0e4c8;margin-bottom:48px;}
    .lp-hero h1{font-size:34px;color:#C4943D;margin:0 0 16px;letter-spacing:-0.5px;line-height:1.2;}
    .lp-hero .lp-tagline{font-size:17px;color:#666;max-width:620px;margin:0 auto 24px;}
    .lp-cta{display:inline-block;background:#C4943D;color:#fff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 16px rgba(196,148,61,0.25);}
    .lp-cta:hover{background:#a87a30;}
    .lp-section{margin-bottom:48px;}
    .lp-section h2{font-size:24px;color:#1a5276;margin:0 0 16px;border-left:4px solid #C4943D;padding-left:14px;}
    .lp-section p{margin:0 0 14px;font-size:16px;}
    .lp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin:20px 0;}
    .lp-card{background:#fff;border:1px solid #f0e4c8;border-radius:12px;padding:18px;}
    .lp-card h3{margin:0 0 8px;font-size:17px;color:#C4943D;}
    .lp-card .lp-price{font-size:20px;font-weight:700;color:#1a5276;margin:6px 0;}
    .lp-card .lp-detail{font-size:13px;color:#777;}
    .lp-info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px;background:#fff;border-radius:12px;padding:24px;border:1px solid #f0e4c8;}
    .lp-info-grid h3{margin:0 0 8px;font-size:15px;color:#1a5276;text-transform:uppercase;letter-spacing:0.5px;}
    .lp-info-grid address{font-style:normal;font-size:15px;}
    .lp-faq{margin-top:24px;}
    .lp-faq dt{font-weight:700;color:#1a5276;margin-top:14px;}
    .lp-faq dd{margin:6px 0 0;padding-left:0;color:#444;}
    .lp-loading{text-align:center;color:#999;font-size:13px;margin-top:48px;padding:20px;border-top:1px solid #f0e4c8;}
    @media (max-width:600px){.lp-hero h1{font-size:26px;}.lp-section h2{font-size:20px;}}
  `;

  const landing = `
    <div id="seo-content" class="lp-wrap">
      <style>${landingCss.replace(/\s+/g,' ').trim()}</style>
      <div class="lp-container">
        <header class="lp-hero">
          <h1>La Plage Tournesol</h1>
          <p class="lp-tagline">Beach club et restaurant à <strong>Estepona</strong>, sur la <strong>Costa del Sol</strong>. Transats face à la mer, BEDs, cuisine méditerranéenne, soirées DJ et pool parties — réservation en ligne, paiement sécurisé.</p>
          <a class="lp-cta" href="#reserver" id="lp-reserver">Réserver un transat ou une table</a>
        </header>

        <section class="lp-section">
          <h2>Location de transats et BEDs sur la plage d'Estepona</h2>
          <p>Choisissez votre emplacement sur notre plage privée d'Estepona parmi six rangées : de la <em>première ligne face à la mer</em> aux chaises longues près du club. Le plan interactif vous montre en temps réel les transats disponibles. Réservez en quelques secondes et payez l'empreinte de carte bancaire en ligne via Stripe.</p>
          <div class="lp-grid">
            <div class="lp-card"><h3>Chaise longue</h3><div class="lp-price">12 €</div><div class="lp-detail">Près du club, à l'ombre des palmiers</div></div>
            <div class="lp-card"><h3>Transat parasol</h3><div class="lp-price">25 €</div><div class="lp-detail">Avec parasol pour deux personnes</div></div>
            <div class="lp-card"><h3>Transat 1ère ligne</h3><div class="lp-price">25 €</div><div class="lp-detail">Vue mer imprenable, face aux vagues</div></div>
            <div class="lp-card"><h3>BED double</h3><div class="lp-price">70 €</div><div class="lp-detail">Pour 2 personnes — emplacement central</div></div>
            <div class="lp-card"><h3>BED + cava</h3><div class="lp-price">80 €</div><div class="lp-detail">BED double avec une bouteille de cava incluse</div></div>
          </div>
        </section>

        <section class="lp-section">
          <h2>Restaurant de plage : cuisine méditerranéenne</h2>
          <p>Notre restaurant propose une carte méditerranéenne et de la mer : poissons frais grillés, paellas, tapas, salades, fruits frais. Service tous les jours : midi (12h–17h) et soir (19h–21h30). Réservez votre table en ligne, <strong>gratuitement et sans empreinte bancaire</strong>. Vue mer panoramique et terrasse en plein air.</p>
        </section>

        <section class="lp-section">
          <h2>Soirées DJ et pool parties à Estepona</h2>
          <p>Programme régulier d'événements en saison : DJ sets sur la plage, pool parties, soirées thématiques. La billetterie et le programme à jour sont disponibles dans notre application. Idéal pour un anniversaire, un EVJF/EVG ou un événement privatisé sur la Costa del Sol.</p>
        </section>

        <section class="lp-section" id="contact">
          <h2>Informations pratiques</h2>
          <div class="lp-info-grid">
            <div>
              <h3>Adresse</h3>
              <address><strong>La Plage Tournesol</strong><br/>Avenida del Litoral<br/>29680 Estepona<br/>Málaga, Espagne</address>
            </div>
            <div>
              <h3>Horaires</h3>
              <p>Tous les jours en saison<br/>10h00 – 23h00<br/><small>Restaurant service jusqu'à 23h30 ven/sam</small></p>
            </div>
            <div>
              <h3>Paiement</h3>
              <p>Carte bancaire (Stripe)<br/>Apple Pay, Google Pay<br/>Espèces sur place</p>
            </div>
            <div>
              <h3>Langues parlées</h3>
              <p>Français, Español, English</p>
            </div>
          </div>
        </section>

        <section class="lp-section">
          <h2>Questions fréquentes</h2>
          <dl class="lp-faq">
            <dt>Comment réserver un transat à La Plage Tournesol ?</dt>
            <dd>Choisissez votre date, sélectionnez votre emplacement sur le plan interactif et payez en ligne via carte bancaire. Vous recevez immédiatement la confirmation par e-mail et WhatsApp avec un QR code à présenter à l'arrivée.</dd>
            <dt>Puis-je modifier ou annuler ma réservation ?</dt>
            <dd>Oui, vous pouvez modifier la date ou les transats jusqu'à 24h avant votre venue depuis votre espace « Mes Réservations ». La différence de prix est ajustée automatiquement.</dd>
            <dt>Quels sont les tarifs des transats à Estepona ?</dt>
            <dd>Chaise longue 12 €, transat parasol ou première ligne 25 €, BED double 70 €, BED avec bouteille de cava 80 €. Les prix sont par jour et incluent l'accès à la plage.</dd>
            <dt>Le restaurant accepte-t-il les groupes ?</dt>
            <dd>Oui, nous accueillons les groupes sur réservation. Pour les groupes de plus de 10 personnes, contactez-nous directement pour organiser votre événement.</dd>
            <dt>Y a-t-il un parking ?</dt>
            <dd>Plusieurs parkings publics sont disponibles à proximité immédiate, le long de l'Avenida del Litoral à Estepona.</dd>
          </dl>
        </section>

        <p class="lp-loading">Chargement de votre application de réservation…</p>
      </div>
    </div>`;

  // Le contenu SEO est injecté DANS #root : il sert d'écran de chargement
  // crawlable, puis React le remplace par l'app au montage (boutons fonctionnels).
  // NB: le mettre en frère de #root le laissait visible/figé par-dessus l'app
  // (boutons morts) — à ne pas refaire.
  html = html.replace('<div id="root"></div>', `<div id="root">${landing}</div>`);

  fs.writeFileSync(indexPath, html);
  console.log('[post-build] index.html patched (CSS + SEO dans #root + crawlable content)');
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
function writeGoogleVerification() {
  // Fichier de validation Google Search Console (servi à la racine du site).
  const name = 'googleda5be020b0070f57.html';
  fs.writeFileSync(path.join(DIST, name), `google-site-verification: ${name}\n`);
  console.log(`[post-build] ${name} (Google Search Console) écrit`);
}

patchBundles();
writeGoogleVerification();
console.log('[post-build] done');
