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

// Pays mis en avant (clientèle principale de la plage + Golfe/Moyen-Orient),
// affichés en premier pour un accès rapide.
const PRIORITY: Country[] = [
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
  { iso: 'US', name: 'États-Unis', dial: '1' },
  { iso: 'AE', name: 'Émirats arabes unis', dial: '971' },
  { iso: 'SA', name: 'Arabie saoudite', dial: '966' },
  { iso: 'KW', name: 'Koweït', dial: '965' },
  { iso: 'QA', name: 'Qatar', dial: '974' },
  { iso: 'BH', name: 'Bahreïn', dial: '973' },
  { iso: 'OM', name: 'Oman', dial: '968' },
  { iso: 'IL', name: 'Israël', dial: '972' },
  { iso: 'LB', name: 'Liban', dial: '961' },
];

// Tous les autres pays / territoires (triés alphabétiquement au chargement).
const OTHERS: Country[] = [
  { iso: 'AF', name: 'Afghanistan', dial: '93' },
  { iso: 'ZA', name: 'Afrique du Sud', dial: '27' },
  { iso: 'AL', name: 'Albanie', dial: '355' },
  { iso: 'DZ', name: 'Algérie', dial: '213' },
  { iso: 'AD', name: 'Andorre', dial: '376' },
  { iso: 'AO', name: 'Angola', dial: '244' },
  { iso: 'AI', name: 'Anguilla', dial: '1264' },
  { iso: 'AG', name: 'Antigua-et-Barbuda', dial: '1268' },
  { iso: 'AR', name: 'Argentine', dial: '54' },
  { iso: 'AM', name: 'Arménie', dial: '374' },
  { iso: 'AW', name: 'Aruba', dial: '297' },
  { iso: 'AU', name: 'Australie', dial: '61' },
  { iso: 'AT', name: 'Autriche', dial: '43' },
  { iso: 'AZ', name: 'Azerbaïdjan', dial: '994' },
  { iso: 'BS', name: 'Bahamas', dial: '1242' },
  { iso: 'BD', name: 'Bangladesh', dial: '880' },
  { iso: 'BB', name: 'Barbade', dial: '1246' },
  { iso: 'BZ', name: 'Belize', dial: '501' },
  { iso: 'BJ', name: 'Bénin', dial: '229' },
  { iso: 'BM', name: 'Bermudes', dial: '1441' },
  { iso: 'BT', name: 'Bhoutan', dial: '975' },
  { iso: 'BY', name: 'Biélorussie', dial: '375' },
  { iso: 'BO', name: 'Bolivie', dial: '591' },
  { iso: 'BA', name: 'Bosnie-Herzégovine', dial: '387' },
  { iso: 'BW', name: 'Botswana', dial: '267' },
  { iso: 'BR', name: 'Brésil', dial: '55' },
  { iso: 'BN', name: 'Brunei', dial: '673' },
  { iso: 'BG', name: 'Bulgarie', dial: '359' },
  { iso: 'BF', name: 'Burkina Faso', dial: '226' },
  { iso: 'BI', name: 'Burundi', dial: '257' },
  { iso: 'KH', name: 'Cambodge', dial: '855' },
  { iso: 'CM', name: 'Cameroun', dial: '237' },
  { iso: 'CA', name: 'Canada', dial: '1' },
  { iso: 'CV', name: 'Cap-Vert', dial: '238' },
  { iso: 'CL', name: 'Chili', dial: '56' },
  { iso: 'CN', name: 'Chine', dial: '86' },
  { iso: 'CY', name: 'Chypre', dial: '357' },
  { iso: 'CO', name: 'Colombie', dial: '57' },
  { iso: 'KM', name: 'Comores', dial: '269' },
  { iso: 'CG', name: 'Congo', dial: '242' },
  { iso: 'CD', name: 'Congo (RDC)', dial: '243' },
  { iso: 'KP', name: 'Corée du Nord', dial: '850' },
  { iso: 'KR', name: 'Corée du Sud', dial: '82' },
  { iso: 'CR', name: 'Costa Rica', dial: '506' },
  { iso: 'CI', name: "Côte d'Ivoire", dial: '225' },
  { iso: 'HR', name: 'Croatie', dial: '385' },
  { iso: 'CU', name: 'Cuba', dial: '53' },
  { iso: 'DK', name: 'Danemark', dial: '45' },
  { iso: 'DJ', name: 'Djibouti', dial: '253' },
  { iso: 'DM', name: 'Dominique', dial: '1767' },
  { iso: 'EG', name: 'Égypte', dial: '20' },
  { iso: 'EC', name: 'Équateur', dial: '593' },
  { iso: 'ER', name: 'Érythrée', dial: '291' },
  { iso: 'EE', name: 'Estonie', dial: '372' },
  { iso: 'SZ', name: 'Eswatini', dial: '268' },
  { iso: 'ET', name: 'Éthiopie', dial: '251' },
  { iso: 'FJ', name: 'Fidji', dial: '679' },
  { iso: 'FI', name: 'Finlande', dial: '358' },
  { iso: 'GA', name: 'Gabon', dial: '241' },
  { iso: 'GM', name: 'Gambie', dial: '220' },
  { iso: 'GE', name: 'Géorgie', dial: '995' },
  { iso: 'GH', name: 'Ghana', dial: '233' },
  { iso: 'GI', name: 'Gibraltar', dial: '350' },
  { iso: 'GR', name: 'Grèce', dial: '30' },
  { iso: 'GD', name: 'Grenade', dial: '1473' },
  { iso: 'GL', name: 'Groenland', dial: '299' },
  { iso: 'GP', name: 'Guadeloupe', dial: '590' },
  { iso: 'GT', name: 'Guatemala', dial: '502' },
  { iso: 'GN', name: 'Guinée', dial: '224' },
  { iso: 'GQ', name: 'Guinée équatoriale', dial: '240' },
  { iso: 'GW', name: 'Guinée-Bissau', dial: '245' },
  { iso: 'GY', name: 'Guyana', dial: '592' },
  { iso: 'GF', name: 'Guyane française', dial: '594' },
  { iso: 'HT', name: 'Haïti', dial: '509' },
  { iso: 'HN', name: 'Honduras', dial: '504' },
  { iso: 'HK', name: 'Hong Kong', dial: '852' },
  { iso: 'HU', name: 'Hongrie', dial: '36' },
  { iso: 'IN', name: 'Inde', dial: '91' },
  { iso: 'ID', name: 'Indonésie', dial: '62' },
  { iso: 'IQ', name: 'Irak', dial: '964' },
  { iso: 'IR', name: 'Iran', dial: '98' },
  { iso: 'IE', name: 'Irlande', dial: '353' },
  { iso: 'IS', name: 'Islande', dial: '354' },
  { iso: 'JM', name: 'Jamaïque', dial: '1876' },
  { iso: 'JP', name: 'Japon', dial: '81' },
  { iso: 'JO', name: 'Jordanie', dial: '962' },
  { iso: 'KZ', name: 'Kazakhstan', dial: '7' },
  { iso: 'KE', name: 'Kenya', dial: '254' },
  { iso: 'KG', name: 'Kirghizistan', dial: '996' },
  { iso: 'KI', name: 'Kiribati', dial: '686' },
  { iso: 'XK', name: 'Kosovo', dial: '383' },
  { iso: 'LA', name: 'Laos', dial: '856' },
  { iso: 'LS', name: 'Lesotho', dial: '266' },
  { iso: 'LV', name: 'Lettonie', dial: '371' },
  { iso: 'LR', name: 'Liberia', dial: '231' },
  { iso: 'LY', name: 'Libye', dial: '218' },
  { iso: 'LI', name: 'Liechtenstein', dial: '423' },
  { iso: 'LT', name: 'Lituanie', dial: '370' },
  { iso: 'MK', name: 'Macédoine du Nord', dial: '389' },
  { iso: 'MG', name: 'Madagascar', dial: '261' },
  { iso: 'MY', name: 'Malaisie', dial: '60' },
  { iso: 'MW', name: 'Malawi', dial: '265' },
  { iso: 'MV', name: 'Maldives', dial: '960' },
  { iso: 'ML', name: 'Mali', dial: '223' },
  { iso: 'MT', name: 'Malte', dial: '356' },
  { iso: 'MA', name: 'Maroc', dial: '212' },
  { iso: 'MQ', name: 'Martinique', dial: '596' },
  { iso: 'MU', name: 'Maurice', dial: '230' },
  { iso: 'MR', name: 'Mauritanie', dial: '222' },
  { iso: 'YT', name: 'Mayotte', dial: '262' },
  { iso: 'MX', name: 'Mexique', dial: '52' },
  { iso: 'FM', name: 'Micronésie', dial: '691' },
  { iso: 'MD', name: 'Moldavie', dial: '373' },
  { iso: 'MC', name: 'Monaco', dial: '377' },
  { iso: 'MN', name: 'Mongolie', dial: '976' },
  { iso: 'ME', name: 'Monténégro', dial: '382' },
  { iso: 'MS', name: 'Montserrat', dial: '1664' },
  { iso: 'MZ', name: 'Mozambique', dial: '258' },
  { iso: 'MM', name: 'Myanmar (Birmanie)', dial: '95' },
  { iso: 'NA', name: 'Namibie', dial: '264' },
  { iso: 'NR', name: 'Nauru', dial: '674' },
  { iso: 'NP', name: 'Népal', dial: '977' },
  { iso: 'NI', name: 'Nicaragua', dial: '505' },
  { iso: 'NE', name: 'Niger', dial: '227' },
  { iso: 'NG', name: 'Nigeria', dial: '234' },
  { iso: 'NO', name: 'Norvège', dial: '47' },
  { iso: 'NC', name: 'Nouvelle-Calédonie', dial: '687' },
  { iso: 'NZ', name: 'Nouvelle-Zélande', dial: '64' },
  { iso: 'UG', name: 'Ouganda', dial: '256' },
  { iso: 'UZ', name: 'Ouzbékistan', dial: '998' },
  { iso: 'PK', name: 'Pakistan', dial: '92' },
  { iso: 'PW', name: 'Palaos', dial: '680' },
  { iso: 'PS', name: 'Palestine', dial: '970' },
  { iso: 'PA', name: 'Panama', dial: '507' },
  { iso: 'PG', name: 'Papouasie-Nouvelle-Guinée', dial: '675' },
  { iso: 'PY', name: 'Paraguay', dial: '595' },
  { iso: 'PE', name: 'Pérou', dial: '51' },
  { iso: 'PH', name: 'Philippines', dial: '63' },
  { iso: 'PL', name: 'Pologne', dial: '48' },
  { iso: 'PF', name: 'Polynésie française', dial: '689' },
  { iso: 'PR', name: 'Porto Rico', dial: '1787' },
  { iso: 'DO', name: 'République dominicaine', dial: '1809' },
  { iso: 'RE', name: 'Réunion', dial: '262' },
  { iso: 'RO', name: 'Roumanie', dial: '40' },
  { iso: 'RU', name: 'Russie', dial: '7' },
  { iso: 'RW', name: 'Rwanda', dial: '250' },
  { iso: 'KN', name: 'Saint-Kitts-et-Nevis', dial: '1869' },
  { iso: 'SM', name: 'Saint-Marin', dial: '378' },
  { iso: 'VC', name: 'Saint-Vincent-et-les-Grenadines', dial: '1784' },
  { iso: 'LC', name: 'Sainte-Lucie', dial: '1758' },
  { iso: 'SB', name: 'Salomon (Îles)', dial: '677' },
  { iso: 'SV', name: 'Salvador', dial: '503' },
  { iso: 'WS', name: 'Samoa', dial: '685' },
  { iso: 'ST', name: 'Sao Tomé-et-Principe', dial: '239' },
  { iso: 'SN', name: 'Sénégal', dial: '221' },
  { iso: 'RS', name: 'Serbie', dial: '381' },
  { iso: 'SC', name: 'Seychelles', dial: '248' },
  { iso: 'SL', name: 'Sierra Leone', dial: '232' },
  { iso: 'SG', name: 'Singapour', dial: '65' },
  { iso: 'SK', name: 'Slovaquie', dial: '421' },
  { iso: 'SI', name: 'Slovénie', dial: '386' },
  { iso: 'SO', name: 'Somalie', dial: '252' },
  { iso: 'SD', name: 'Soudan', dial: '249' },
  { iso: 'SS', name: 'Soudan du Sud', dial: '211' },
  { iso: 'LK', name: 'Sri Lanka', dial: '94' },
  { iso: 'SE', name: 'Suède', dial: '46' },
  { iso: 'SR', name: 'Suriname', dial: '597' },
  { iso: 'SY', name: 'Syrie', dial: '963' },
  { iso: 'TJ', name: 'Tadjikistan', dial: '992' },
  { iso: 'TW', name: 'Taïwan', dial: '886' },
  { iso: 'TZ', name: 'Tanzanie', dial: '255' },
  { iso: 'TD', name: 'Tchad', dial: '235' },
  { iso: 'CZ', name: 'Tchéquie', dial: '420' },
  { iso: 'TH', name: 'Thaïlande', dial: '66' },
  { iso: 'TL', name: 'Timor oriental', dial: '670' },
  { iso: 'TG', name: 'Togo', dial: '228' },
  { iso: 'TO', name: 'Tonga', dial: '676' },
  { iso: 'TT', name: 'Trinité-et-Tobago', dial: '1868' },
  { iso: 'TN', name: 'Tunisie', dial: '216' },
  { iso: 'TM', name: 'Turkménistan', dial: '993' },
  { iso: 'TR', name: 'Turquie', dial: '90' },
  { iso: 'TV', name: 'Tuvalu', dial: '688' },
  { iso: 'UA', name: 'Ukraine', dial: '380' },
  { iso: 'UY', name: 'Uruguay', dial: '598' },
  { iso: 'VU', name: 'Vanuatu', dial: '678' },
  { iso: 'VE', name: 'Venezuela', dial: '58' },
  { iso: 'VN', name: 'Vietnam', dial: '84' },
  { iso: 'YE', name: 'Yémen', dial: '967' },
  { iso: 'ZM', name: 'Zambie', dial: '260' },
  { iso: 'ZW', name: 'Zimbabwe', dial: '263' },
];

// Clientèle prioritaire en premier, puis le reste du monde par ordre alphabétique (fr).
export const COUNTRIES: Country[] = [
  ...PRIORITY,
  ...OTHERS.sort((a, b) => a.name.localeCompare(b.name, 'fr')),
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
