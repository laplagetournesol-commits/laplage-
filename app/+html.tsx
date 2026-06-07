import { type PropsWithChildren } from 'react';

/**
 * Custom HTML template for Expo Router web.
 * - Adds full SEO meta tags + Open Graph + JSON-LD LocalBusiness
 * - `display:flex;flex-direction:column` on body is required for Firefox to
 *   correctly expand #root with `flex:1`.
 */

const SITE_URL = 'https://laplagetournesols.com';
const OG_IMAGE = `${SITE_URL}/assets/og-image.jpg`;

const TITLE = 'La Plage Tournesol — Beach Club & Restaurant à Estepona';
const DESCRIPTION =
  'Beach club et restaurant de plage à Estepona, Costa del Sol. Réservez votre transat, une table au restaurant ou vos billets pour nos soirées DJ en ligne. Paiement sécurisé.';

const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': ['LocalBusiness', 'Restaurant'],
  name: 'La Plage Tournesol',
  description:
    'Beach club et restaurant de plage à Estepona, Costa del Sol. Location de transats, restaurant, soirées DJ et pool parties.',
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
};

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={`${SITE_URL}/`} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/`} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:locale:alternate" content="es_ES" />
        <meta property="og:locale:alternate" content="en_US" />
        <meta property="og:site_name" content="La Plage Tournesol" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />

        {/* Structured Data — LocalBusiness + Restaurant */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />

        {/* react-native-web recommended reset + Firefox flex fix on body */}
        <style
          id="expo-reset"
          dangerouslySetInnerHTML={{
            __html: `html,body{height:100%}body{overflow:hidden;display:flex;flex-direction:column}#root{display:flex;flex:1}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
