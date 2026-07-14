#!/usr/bin/env node
/**
 * Génère des pages statiques SEO multilingues (ES/EN) dans dist/.
 * Ce sont de vraies landing pages prérendues (crawlables), avec head complet
 * (hreflang, canonical, OG, JSON-LD) et un CTA qui renvoie vers l'app pour réserver.
 * Exclues de la réécriture SPA via vercel.json (préfixes /es et /en).
 *
 * Régénère aussi dist/sitemap.xml avec toutes les URLs + hreflang.
 */
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const SITE = 'https://laplagetournesols.com';
const pages = JSON.parse(fs.readFileSync(path.join(__dirname, 'seo-content.json'), 'utf8'));

// Clusters hreflang (versions équivalentes d'une même page dans plusieurs langues).
const CLUSTERS = [
  { fr: '/', es: '/es', en: '/en', 'x-default': '/' },
  { es: '/es/hamacas-estepona', en: '/en/sunbeds-day-beds-estepona' },
];
function alternatesFor(p) {
  const c = CLUSTERS.find((cl) => Object.values(cl).includes(p));
  return c || null;
}

const CTA = {
  es: 'Reservar hamaca o mesa',
  en: 'Book a sunbed or table',
  fr: 'Réserver un transat ou une table',
};
const NAV = { es: 'Español', en: 'English', fr: 'Français' };
const HOME = { fr: '/', es: '/es', en: '/en' };

const CSS = `
*{box-sizing:border-box}body{margin:0}
.lp-wrap{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2c3e50;line-height:1.65;background:linear-gradient(180deg,#fdf8f0 0%,#fff 600px);min-height:100vh;}
.lp-container{max-width:980px;margin:0 auto;padding:32px 20px 64px;}
.lp-hero{text-align:center;padding:40px 0 28px;border-bottom:1px solid #f0e4c8;margin-bottom:40px;}
.lp-hero h1{font-size:33px;color:#C4943D;margin:0 0 16px;letter-spacing:-0.5px;line-height:1.2;}
.lp-cta{display:inline-block;background:#C4943D;color:#fff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 16px rgba(196,148,61,0.25);}
.lp-cta:hover{background:#a87a30;}
.lp-body h2{font-size:23px;color:#1a5276;margin:36px 0 14px;border-left:4px solid #C4943D;padding-left:14px;}
.lp-body h3{font-size:17px;color:#C4943D;margin:20px 0 8px;}
.lp-body p{margin:0 0 14px;font-size:16px;}
.lp-body ul,.lp-body ol{margin:0 0 16px;padding-left:22px;}
.lp-body li{margin:6px 0;}
.lp-body table{width:100%;border-collapse:collapse;margin:16px 0;}
.lp-body th,.lp-body td{border:1px solid #f0e4c8;padding:8px 12px;text-align:left;font-size:15px;}
.lp-body dl dt{font-weight:700;color:#1a5276;margin-top:14px;}
.lp-body dl dd{margin:6px 0 0;color:#444;}
.lp-foot{margin-top:48px;padding-top:24px;border-top:1px solid #f0e4c8;text-align:center;font-size:14px;color:#777;}
.lp-foot a{color:#C4943D;text-decoration:none;margin:0 8px;font-weight:600;}
@media(max-width:600px){.lp-hero h1{font-size:26px;}.lp-body h2{font-size:20px;}}
`.replace(/\s+/g, ' ').trim();

function langLinks(currentLang) {
  return Object.entries(HOME)
    .map(([l, href]) => l === currentLang ? `<strong>${NAV[l]}</strong>` : `<a href="${href}">${NAV[l]}</a>`)
    .join(' · ');
}

function renderPage(p) {
  const lang = p.lang;
  const url = SITE + p.path;
  const alts = alternatesFor(p.path);
  let hreflang = '';
  if (alts) {
    hreflang = Object.entries(alts)
      .map(([l, href]) => `\n    <link rel="alternate" hreflang="${l}" href="${SITE}${href}" />`)
      .join('');
  }
  const ogLocale = lang === 'es' ? 'es_ES' : lang === 'en' ? 'en_US' : 'fr_FR';
  const schema = (p.schema_jsonld || '').trim();
  const schemaTag = schema ? `\n    <script type="application/ld+json">${schema}</script>` : '';

  return `<!DOCTYPE html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${p.meta_title}</title>
    <meta name="description" content="${(p.meta_description || '').replace(/"/g, '&quot;')}" />
    <link rel="canonical" href="${url}" />${hreflang}
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${p.meta_title}" />
    <meta property="og:description" content="${(p.meta_description || '').replace(/"/g, '&quot;')}" />
    <meta property="og:image" content="${SITE}/og-image.jpg" />
    <meta property="og:locale" content="${ogLocale}" />
    <meta property="og:site_name" content="La Plage Tournesol" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="${SITE}/og-image.jpg" />${schemaTag}
    <style>${CSS}</style>
  </head>
  <body>
    <div class="lp-wrap">
      <div class="lp-container">
        <header class="lp-hero">
          <h1>${p.h1}</h1>
          <a class="lp-cta" href="/">${CTA[lang] || CTA.fr}</a>
        </header>
        <main class="lp-body">
${p.body_html || ''}
        </main>
        <footer class="lp-foot">
          <p><a class="lp-cta" href="/">${CTA[lang] || CTA.fr}</a></p>
          <p style="margin-top:20px">${langLinks(lang)}</p>
          <p>La Plage Tournesol · Avenida del Litoral, 29680 Estepona, Málaga · España</p>
        </footer>
      </div>
    </div>
  </body>
</html>`;
}

function writePages() {
  let count = 0;
  for (const p of pages) {
    if (p.path === '/') continue; // l'accueil = l'app (géré par post-web-build)
    const dir = path.join(DIST, p.path.replace(/^\//, ''));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderPage(p));
    count++;
  }
  console.log(`[seo-pages] ${count} pages statiques générées (ES/EN)`);
}

function writeSitemap() {
  const urls = [
    { loc: '/', changefreq: 'weekly', priority: '1.0' },
    ...pages.filter((p) => p.path !== '/').map((p) => ({ loc: p.path, changefreq: 'weekly', priority: '0.9' })),
    { loc: '/privacy.html', priority: '0.3' },
    { loc: '/terms.html', priority: '0.3' },
    { loc: '/support.html', priority: '0.3' },
  ];
  const body = urls.map((u) => {
    const alts = alternatesFor(u.loc);
    let x = '';
    if (alts) {
      x = Object.entries(alts).map(([l, href]) => `\n    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${href}" />`).join('');
    }
    return `  <url>\n    <loc>${SITE}${u.loc}</loc>${x}\n    <changefreq>${u.changefreq || 'monthly'}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`;
  }).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`;
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), xml);
  console.log(`[seo-pages] sitemap.xml régénéré (${urls.length} URLs)`);
}

module.exports = function generateSeoPages() {
  if (!fs.existsSync(DIST)) return;
  writePages();
  writeSitemap();
};
