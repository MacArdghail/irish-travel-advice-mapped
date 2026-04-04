// Country name to slug mappings
const COUNTRY_NAME_MAP: { [key: string]: string } = {
  'Russia': 'russian-federation',
  'South Korea': 'republic-of-korea',
  'North Korea': 'democratic-republic-of-korea',
  'Czechia': 'czech-republic',
  'Turkey': 'turkiye',
  'United Kingdom': 'great-britain',
  'Netherlands': 'the-netherlands',
  'Ivory Coast': 'cote-divoire',
  'East Timor': 'timor-leste',
  'Brunei': 'brunei-darussalam',
  'Myanmar': 'myanmar-burma',
  'Gambia': 'republic-of-the-gambia',
  'Vatican': 'holy-see',
  'The Bahamas': 'bahamas',
  'United Republic of Tanzania': 'tanzania',
  'Democratic Republic of the Congo': 'democratic-republic-of-congo',
  'Republic of the Congo': 'congo',
  'North Macedonia': 'republic-of-north-macedonia',
  'Republic of Serbia': 'serbia',
  'Cabo Verde': 'cape-verde',
  'São Tomé and Principe': 'saint-tome-sao-tome-and-principe',
  'Slovakia': 'slovak-republic-slovakia',
  'Ireland': 'ireland',
  'San Marino': 'san-marino',
  'Hong Kong S.A.R.': 'china-hong-kong-macao',
  'Macao S.A.R': 'china-hong-kong-macao',
  'United States Virgin Islands': 'virgin-islands-us',
  'British Virgin Islands': 'virgin-islands-uk',
  'Northern Cyprus': 'cyprus',
  // British territories
  'Jersey': 'great-britain',
  'Guernsey': 'great-britain',
  'Isle of Man': 'great-britain',
  // Finnish territory
  'Aland': 'finland'
};

// Territory markers for small territories with separate advisories
export const TERRITORY_MARKERS = [
  // French territories
  { name: 'Guadeloupe', slug: 'guadeloupe', coords: [16.25, -61.55] },
  { name: 'French Guiana', slug: 'french-guiana', coords: [4.0, -53.0] },
  { name: 'Martinique', slug: 'martinique', coords: [14.64, -61.0] },
  { name: 'Réunion', slug: 'reunion', coords: [-21.1, 55.5] },
  { name: 'Mayotte', slug: 'mayotte', coords: [-12.8, 45.2] },
];

export function getCountrySlug(countryName: string): string {
  // Check if we have a manual mapping
  if (COUNTRY_NAME_MAP[countryName]) {
    return COUNTRY_NAME_MAP[countryName];
  }

  // Default: convert to slug format
  return countryName.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function getMarkerColor(status: string): string {
  switch (status) {
    case 'normal-precautions':
      return '#00ba42';
    case 'high-degree-of-caution':
      return '#ffc300';
    case 'avoid-non-essential-travel':
      return '#f07400';
    case 'do-not-travel':
      return '#f00000';
    default:
      return '#cccccc';
  }
}

export function formatStatus(status: string): string {
  return status.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}
