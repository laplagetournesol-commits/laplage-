// Liste de pays avec indicatif téléphonique.
// Le drapeau emoji est généré à partir du code ISO (regional indicators).

export interface Country {
  iso: string; // ISO 3166-1 alpha-2
  name: string;
  dial: string; // indicatif sans le "+"
}

/** Drapeau emoji à partir du code ISO ("FR" -> 🇫🇷). */
export function flagEmoji(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

// Pays mis en avant (clientèle principale de la plage), puis le reste.
export const COUNTRIES: Country[] = [
  { iso: 'FR', name: 'France', dial: '33' },
  { iso: 'BE', name: 'Belgique', dial: '32' },
  { iso: 'CH', name: 'Suisse', dial: '41' },
  { iso: 'NL', name: 'Pays-Bas', dial: '31' },
  { iso: 'DE', name: 'Allemagne', dial: '49' },
  { iso: 'ES', name: 'Espagne', dial: '34' },
  { iso: 'GB', name: 'Royaume-Uni', dial: '44' },
  { iso: 'IT', name: 'Italie', dial: '39' },
  { iso: 'PT', name: 'Portugal', dial: '351' },
  { iso: 'LU', name: 'Luxembourg', dial: '352' },
  { iso: 'IE', name: 'Irlande', dial: '353' },
  { iso: 'AT', name: 'Autriche', dial: '43' },
  { iso: 'DK', name: 'Danemark', dial: '45' },
  { iso: 'SE', name: 'Suède', dial: '46' },
  { iso: 'NO', name: 'Norvège', dial: '47' },
  { iso: 'FI', name: 'Finlande', dial: '358' },
  { iso: 'PL', name: 'Pologne', dial: '48' },
  { iso: 'CZ', name: 'Tchéquie', dial: '420' },
  { iso: 'GR', name: 'Grèce', dial: '30' },
  { iso: 'US', name: 'États-Unis', dial: '1' },
  { iso: 'CA', name: 'Canada', dial: '1' },
  { iso: 'MA', name: 'Maroc', dial: '212' },
  { iso: 'DZ', name: 'Algérie', dial: '213' },
  { iso: 'TN', name: 'Tunisie', dial: '216' },
  { iso: 'RU', name: 'Russie', dial: '7' },
  { iso: 'AU', name: 'Australie', dial: '61' },
  { iso: 'BR', name: 'Brésil', dial: '55' },
  { iso: 'AR', name: 'Argentine', dial: '54' },
  { iso: 'MX', name: 'Mexique', dial: '52' },
  { iso: 'JP', name: 'Japon', dial: '81' },
  { iso: 'CN', name: 'Chine', dial: '86' },
  { iso: 'IN', name: 'Inde', dial: '91' },
  { iso: 'AE', name: 'Émirats arabes unis', dial: '971' },
  { iso: 'IL', name: 'Israël', dial: '972' },
  { iso: 'TR', name: 'Turquie', dial: '90' },
  { iso: 'RO', name: 'Roumanie', dial: '40' },
  { iso: 'HU', name: 'Hongrie', dial: '36' },
  { iso: 'HR', name: 'Croatie', dial: '385' },
  { iso: 'SK', name: 'Slovaquie', dial: '421' },
  { iso: 'SI', name: 'Slovénie', dial: '386' },
  { iso: 'BG', name: 'Bulgarie', dial: '359' },
  { iso: 'UA', name: 'Ukraine', dial: '380' },
  { iso: 'ZA', name: 'Afrique du Sud', dial: '27' },
  { iso: 'EG', name: 'Égypte', dial: '20' },
  { iso: 'SA', name: 'Arabie saoudite', dial: '966' },
  { iso: 'NZ', name: 'Nouvelle-Zélande', dial: '64' },
  { iso: 'SG', name: 'Singapour', dial: '65' },
  { iso: 'HK', name: 'Hong Kong', dial: '852' },
  { iso: 'TH', name: 'Thaïlande', dial: '66' },
  { iso: 'IS', name: 'Islande', dial: '354' },
];

export const DEFAULT_COUNTRY: Country = COUNTRIES[0]; // France

/**
 * Tente de retrouver le pays correspondant à un numéro E.164 (commençant par +).
 * Retourne le pays au plus long indicatif correspondant + le reste (numéro local).
 */
export function parseE164(value: string): { country: Country; local: string } {
  if (value && value.startsWith('+')) {
    const digits = value.slice(1).replace(/\D/g, '');
    // On teste les indicatifs du plus long au plus court pour éviter les collisions.
    const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
    for (const c of sorted) {
      if (digits.startsWith(c.dial)) {
        return { country: c, local: digits.slice(c.dial.length) };
      }
    }
  }
  return { country: DEFAULT_COUNTRY, local: value ? value.replace(/\D/g, '') : '' };
}

/** Construit un numéro E.164 à partir d'un pays + numéro local (sans le 0 initial). */
export function toE164(country: Country, local: string): string {
  let n = local.replace(/\D/g, '');
  // Retire le 0 de tête (format national FR/BE/etc.) avant d'ajouter l'indicatif.
  n = n.replace(/^0+/, '');
  if (!n) return '';
  return `+${country.dial}${n}`;
}
