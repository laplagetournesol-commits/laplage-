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
  const OG_IMAGE = `${SITE_URL}/og-image.jpg`;
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
    acceptsReservations: 'True',
    hasMenu: `${SITE_URL}/menu`,
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

  // FAQPage (les mêmes 5 Q/R que le bloc crawlable ci-dessous) → éligible rich results
  const faqLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      ['Comment réserver un transat à La Plage Tournesol ?', 'Choisissez votre date, sélectionnez votre emplacement sur le plan interactif et payez en ligne via carte bancaire. Vous recevez immédiatement la confirmation par e-mail et WhatsApp avec un QR code à présenter à l\'arrivée.'],
      ['Puis-je modifier ou annuler ma réservation ?', 'Oui, vous pouvez modifier la date ou les transats jusqu\'à 24h avant votre venue depuis votre espace « Mes Réservations ». La différence de prix est ajustée automatiquement.'],
      ['Quels sont les tarifs des transats à Estepona ?', 'Chaise longue 12 €, transat parasol ou première ligne 25 €, BED double 70 €, BED avec bouteille de cava 80 €. Les prix sont par jour et incluent l\'accès à la plage.'],
      ['Le restaurant accepte-t-il les groupes ?', 'Oui, nous accueillons les groupes sur réservation. Pour les groupes de plus de 10 personnes, contactez-nous directement pour organiser votre événement.'],
      ['Y a-t-il un parking ?', 'Plusieurs parkings publics sont disponibles à proximité immédiate, le long de l\'Avenida del Litoral à Estepona.'],
    ].map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  });

  const seoBlock = `    <title>${TITLE}</title>
    <meta name="description" content="${DESC}" />
    <link rel="canonical" href="${SITE_URL}/" />
    <link rel="alternate" hreflang="fr" href="${SITE_URL}/" />
    <link rel="alternate" hreflang="es" href="${SITE_URL}/es" />
    <link rel="alternate" hreflang="en" href="${SITE_URL}/en" />
    <link rel="alternate" hreflang="x-default" href="${SITE_URL}/" />
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
    <script type="application/ld+json">${jsonLd}</script>
    <script type="application/ld+json">${faqLd}</script>`;

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

function writePayPage() {
  // Page de paiement statique dédiée (résa "pour un ami"). Contourne le routeur
  // Expo (les routes dynamiques /pay/<token> ne se résolvent pas en accès direct
  // sur l'export statique -> "Unmatched Route"). Ici : HTML pur qui lit le token,
  // crée la session Stripe via le backend et redirige. Vercel réécrit /pay/* ici.
  const API = 'https://laplage-tournesols.onrender.com';
  const html = [
    '<!doctype html><html lang="fr"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>Paiement - La Plage Tournesol</title>',
    '<style>',
    'html,body{margin:0;height:100%}',
    'body{background:#F4D773;display:flex;align-items:center;justify-content:center;font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:20px}',
    '.card{background:#fff;border-radius:20px;max-width:420px;width:100%;padding:36px 24px;text-align:center;box-sizing:border-box}',
    '.logo{font-size:44px}.brand{font-size:20px;font-weight:800;color:#3D434F;margin:6px 0 0}',
    '.msg{font-size:15px;color:#5b6270;margin:18px 0 0;line-height:1.5}',
    '.spin{margin:22px auto 0;width:34px;height:34px;border:4px solid #eee;border-top-color:#3D434F;border-radius:50%;animation:s 1s linear infinite}',
    '@keyframes s{to{transform:rotate(360deg)}}',
    '.btn{display:none;margin:22px auto 0;background:#3D434F;color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:700;border:0;font-size:16px;cursor:pointer}',
    '</style></head><body><div class="card">',
    '<div class="logo">🌻</div><div class="brand">La Plage Tournesol</div>',
    '<div class="msg" id="msg">Redirection vers le paiement s&eacute;curis&eacute;&hellip;</div>',
    '<div class="spin" id="spin"></div>',
    '<button class="btn" id="retry">Payer &amp; confirmer</button>',
    '</div><script>',
    '(function(){',
    'var API="' + API + '";',
    'var msg=document.getElementById("msg"),spin=document.getElementById("spin"),retry=document.getElementById("retry");',
    'function show(t,hideSpin){msg.innerHTML=t;if(hideSpin){spin.style.display="none";}}',
    'var m=location.pathname.match(/\\/pay\\/([^\\/?#]+)/);var token=m?m[1]:null;',
    'var q=new URLSearchParams(location.search);',
    'if(q.get("status")==="success"){show("\\u2705 Paiement confirm\\u00e9. Ta place est r\\u00e9serv\\u00e9e et ta venue confirm\\u00e9e. \\u00c0 tr\\u00e8s vite \\u2600\\ufe0f",true);return;}',
    'if(!token){show("Lien invalide.",true);return;}',
    'function go(){show("Redirection vers le paiement s\\u00e9curis\\u00e9\\u2026",false);spin.style.display="block";retry.style.display="none";',
    'fetch(API+"/api/payments/guest-checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:token})})',
    '.then(function(r){return r.json();}).then(function(j){',
    'if(j&&j.status==="paid"){show("\\u2705 D\\u00e9j\\u00e0 pay\\u00e9 \\u2014 ta place est confirm\\u00e9e. \\u00c0 tr\\u00e8s vite \\u2600\\ufe0f",true);return;}',
    'if(j&&j.url){location.href=j.url;return;}',
    'show("Lien invalide ou expir\\u00e9.",true);retry.style.display="inline-block";})',
    '.catch(function(){show("Une erreur est survenue. R\\u00e9essaie dans un instant.",true);retry.style.display="inline-block";});}',
    'retry.onclick=go;go();',
    '})();',
    '</scr'+'ipt></body></html>',
  ].join('');
  fs.writeFileSync(path.join(DIST, 'pay.html'), html);
  console.log('[post-build] pay.html (page de paiement statique) écrit');
}

function writeConfirmPage() {
  // Page statique de CONFIRMATION de venue (résa "pour un ami" SANS paiement).
  // Même contournement que pay.html. Vercel réécrit /confirm/* ici.
  const API = 'https://laplage-tournesols.onrender.com';
  const html = [
    '<!doctype html><html lang="fr"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>Confirmer ma venue - La Plage Tournesol</title>',
    '<style>',
    'html,body{margin:0;height:100%}',
    'body{background:#F4D773;display:flex;align-items:center;justify-content:center;font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:20px}',
    '.card{background:#fff;border-radius:20px;max-width:420px;width:100%;padding:36px 24px;text-align:center;box-sizing:border-box}',
    '.logo{font-size:44px}.brand{font-size:20px;font-weight:800;color:#3D434F;margin:6px 0 0}',
    '.msg{font-size:16px;color:#5b6270;margin:18px 0 0;line-height:1.5}',
    '.spin{margin:22px auto 0;width:34px;height:34px;border:4px solid #eee;border-top-color:#3D434F;border-radius:50%;animation:s 1s linear infinite}',
    '@keyframes s{to{transform:rotate(360deg)}}',
    '.btn{display:none;margin:22px auto 0;background:#3D434F;color:#fff;border:0;padding:14px 28px;border-radius:12px;font-weight:700;font-size:16px;cursor:pointer}',
    '</style></head><body><div class="card">',
    '<div class="logo">🌻</div><div class="brand">La Plage Tournesol</div>',
    '<div class="msg" id="msg">Confirmation en cours&hellip;</div>',
    '<div class="spin" id="spin"></div>',
    '<button class="btn" id="retry">R&eacute;essayer</button>',
    '</div><script>',
    '(function(){',
    'var API="' + API + '";',
    'var msg=document.getElementById("msg"),spin=document.getElementById("spin"),retry=document.getElementById("retry");',
    'function show(t,hideSpin){msg.innerHTML=t;if(hideSpin){spin.style.display="none";}}',
    'var m=location.pathname.match(/\\/confirm\\/([^\\/?#]+)/);var token=m?m[1]:null;',
    'if(!token){show("Lien invalide.",true);return;}',
    'function go(){show("Confirmation en cours\\u2026",false);spin.style.display="block";retry.style.display="none";',
    'fetch(API+"/api/payments/guest-confirm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:token})})',
    '.then(function(r){return r.json();}).then(function(j){',
    'if(j&&(j.status==="confirmed"||j.status==="already")){show("\\u2705 C\\u2019est confirm\\u00e9 ! Merci, ta venue est bien enregistr\\u00e9e. \\u00c0 tr\\u00e8s vite \\u2600\\ufe0f",true);return;}',
    'if(j&&j.status==="cancelled"){show("Cette r\\u00e9servation a \\u00e9t\\u00e9 annul\\u00e9e.",true);return;}',
    'show("Lien invalide ou expir\\u00e9.",true);retry.style.display="inline-block";})',
    '.catch(function(){show("Une erreur est survenue. R\\u00e9essaie dans un instant.",true);retry.style.display="inline-block";});}',
    'retry.onclick=go;go();',
    '})();',
    '</scr'+'ipt></body></html>',
  ].join('');
  fs.writeFileSync(path.join(DIST, 'confirm.html'), html);
  console.log('[post-build] confirm.html (page de confirmation statique) écrit');
}

patchBundles();
writeGoogleVerification();
writePayPage();
writeConfirmPage();
require('./seo-pages')();
console.log('[post-build] done');
