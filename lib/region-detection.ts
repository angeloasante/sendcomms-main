// Country and region detection utilities for African countries

// African country phone prefixes
export const PHONE_PREFIXES: Record<string, { country: string; code: string; region: string }> = {
  // West Africa
  '+234': { country: 'Nigeria', code: 'NG', region: 'West Africa' },
  '+233': { country: 'Ghana', code: 'GH', region: 'West Africa' },
  '+225': { country: 'Ivory Coast', code: 'CI', region: 'West Africa' },
  '+221': { country: 'Senegal', code: 'SN', region: 'West Africa' },
  '+226': { country: 'Burkina Faso', code: 'BF', region: 'West Africa' },
  '+223': { country: 'Mali', code: 'ML', region: 'West Africa' },
  '+227': { country: 'Niger', code: 'NE', region: 'West Africa' },
  '+228': { country: 'Togo', code: 'TG', region: 'West Africa' },
  '+229': { country: 'Benin', code: 'BJ', region: 'West Africa' },
  '+232': { country: 'Sierra Leone', code: 'SL', region: 'West Africa' },
  '+231': { country: 'Liberia', code: 'LR', region: 'West Africa' },
  '+220': { country: 'Gambia', code: 'GM', region: 'West Africa' },
  '+224': { country: 'Guinea', code: 'GN', region: 'West Africa' },
  '+245': { country: 'Guinea-Bissau', code: 'GW', region: 'West Africa' },
  '+238': { country: 'Cape Verde', code: 'CV', region: 'West Africa' },
  '+222': { country: 'Mauritania', code: 'MR', region: 'West Africa' },

  // East Africa
  '+254': { country: 'Kenya', code: 'KE', region: 'East Africa' },
  '+255': { country: 'Tanzania', code: 'TZ', region: 'East Africa' },
  '+256': { country: 'Uganda', code: 'UG', region: 'East Africa' },
  '+250': { country: 'Rwanda', code: 'RW', region: 'East Africa' },
  '+257': { country: 'Burundi', code: 'BI', region: 'East Africa' },
  '+251': { country: 'Ethiopia', code: 'ET', region: 'East Africa' },
  '+252': { country: 'Somalia', code: 'SO', region: 'East Africa' },
  '+253': { country: 'Djibouti', code: 'DJ', region: 'East Africa' },
  '+291': { country: 'Eritrea', code: 'ER', region: 'East Africa' },
  '+211': { country: 'South Sudan', code: 'SS', region: 'East Africa' },
  '+269': { country: 'Comoros', code: 'KM', region: 'East Africa' },
  '+261': { country: 'Madagascar', code: 'MG', region: 'East Africa' },
  '+230': { country: 'Mauritius', code: 'MU', region: 'East Africa' },
  '+248': { country: 'Seychelles', code: 'SC', region: 'East Africa' },
  '+262': { country: 'Reunion', code: 'RE', region: 'East Africa' },

  // North Africa
  '+20': { country: 'Egypt', code: 'EG', region: 'North Africa' },
  '+212': { country: 'Morocco', code: 'MA', region: 'North Africa' },
  '+213': { country: 'Algeria', code: 'DZ', region: 'North Africa' },
  '+216': { country: 'Tunisia', code: 'TN', region: 'North Africa' },
  '+218': { country: 'Libya', code: 'LY', region: 'North Africa' },
  '+249': { country: 'Sudan', code: 'SD', region: 'North Africa' },

  // Southern Africa
  '+27': { country: 'South Africa', code: 'ZA', region: 'Southern Africa' },
  '+264': { country: 'Namibia', code: 'NA', region: 'Southern Africa' },
  '+267': { country: 'Botswana', code: 'BW', region: 'Southern Africa' },
  '+268': { country: 'Eswatini', code: 'SZ', region: 'Southern Africa' },
  '+266': { country: 'Lesotho', code: 'LS', region: 'Southern Africa' },
  '+263': { country: 'Zimbabwe', code: 'ZW', region: 'Southern Africa' },
  '+260': { country: 'Zambia', code: 'ZM', region: 'Southern Africa' },
  '+265': { country: 'Malawi', code: 'MW', region: 'Southern Africa' },
  '+258': { country: 'Mozambique', code: 'MZ', region: 'Southern Africa' },

  // Central Africa
  '+237': { country: 'Cameroon', code: 'CM', region: 'Central Africa' },
  '+243': { country: 'DR Congo', code: 'CD', region: 'Central Africa' },
  '+242': { country: 'Congo', code: 'CG', region: 'Central Africa' },
  '+241': { country: 'Gabon', code: 'GA', region: 'Central Africa' },
  '+240': { country: 'Equatorial Guinea', code: 'GQ', region: 'Central Africa' },
  '+236': { country: 'Central African Republic', code: 'CF', region: 'Central Africa' },
  '+235': { country: 'Chad', code: 'TD', region: 'Central Africa' },
  '+244': { country: 'Angola', code: 'AO', region: 'Central Africa' },
  '+239': { country: 'São Tomé and Príncipe', code: 'ST', region: 'Central Africa' },
};

// Email domain country codes (TLDs)
export const EMAIL_DOMAINS: Record<string, { country: string; code: string; region: string }> = {
  // West Africa
  '.ng': { country: 'Nigeria', code: 'NG', region: 'West Africa' },
  '.gh': { country: 'Ghana', code: 'GH', region: 'West Africa' },
  '.ci': { country: 'Ivory Coast', code: 'CI', region: 'West Africa' },
  '.sn': { country: 'Senegal', code: 'SN', region: 'West Africa' },
  '.bf': { country: 'Burkina Faso', code: 'BF', region: 'West Africa' },
  '.ml': { country: 'Mali', code: 'ML', region: 'West Africa' },
  '.tg': { country: 'Togo', code: 'TG', region: 'West Africa' },
  '.bj': { country: 'Benin', code: 'BJ', region: 'West Africa' },
  '.gm': { country: 'Gambia', code: 'GM', region: 'West Africa' },

  // East Africa
  '.ke': { country: 'Kenya', code: 'KE', region: 'East Africa' },
  '.tz': { country: 'Tanzania', code: 'TZ', region: 'East Africa' },
  '.ug': { country: 'Uganda', code: 'UG', region: 'East Africa' },
  '.rw': { country: 'Rwanda', code: 'RW', region: 'East Africa' },
  '.et': { country: 'Ethiopia', code: 'ET', region: 'East Africa' },
  '.mg': { country: 'Madagascar', code: 'MG', region: 'East Africa' },
  '.mu': { country: 'Mauritius', code: 'MU', region: 'East Africa' },

  // North Africa
  '.eg': { country: 'Egypt', code: 'EG', region: 'North Africa' },
  '.ma': { country: 'Morocco', code: 'MA', region: 'North Africa' },
  '.dz': { country: 'Algeria', code: 'DZ', region: 'North Africa' },
  '.tn': { country: 'Tunisia', code: 'TN', region: 'North Africa' },
  '.ly': { country: 'Libya', code: 'LY', region: 'North Africa' },
  '.sd': { country: 'Sudan', code: 'SD', region: 'North Africa' },

  // Southern Africa
  '.za': { country: 'South Africa', code: 'ZA', region: 'Southern Africa' },
  '.na': { country: 'Namibia', code: 'NA', region: 'Southern Africa' },
  '.bw': { country: 'Botswana', code: 'BW', region: 'Southern Africa' },
  '.zw': { country: 'Zimbabwe', code: 'ZW', region: 'Southern Africa' },
  '.zm': { country: 'Zambia', code: 'ZM', region: 'Southern Africa' },
  '.mw': { country: 'Malawi', code: 'MW', region: 'Southern Africa' },
  '.mz': { country: 'Mozambique', code: 'MZ', region: 'Southern Africa' },

  // Central Africa
  '.cm': { country: 'Cameroon', code: 'CM', region: 'Central Africa' },
  '.cd': { country: 'DR Congo', code: 'CD', region: 'Central Africa' },
  '.cg': { country: 'Congo', code: 'CG', region: 'Central Africa' },
  '.ga': { country: 'Gabon', code: 'GA', region: 'Central Africa' },
  '.ao': { country: 'Angola', code: 'AO', region: 'Central Africa' },
};

// Detect country and region from phone number
export function detectFromPhone(phone: string): { country: string; code: string; region: string } | null {
  if (!phone) return null;
  
  // Normalize phone number
  let normalized = phone.replace(/\s+/g, '').replace(/-/g, '');
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }

  // Try to match phone prefixes (longest match first)
  const prefixes = Object.keys(PHONE_PREFIXES).sort((a, b) => b.length - a.length);
  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) {
      return PHONE_PREFIXES[prefix];
    }
  }

  return null;
}

// Detect country and region from email
export function detectFromEmail(email: string): { country: string; code: string; region: string } | null {
  if (!email) return null;
  
  const lowerEmail = email.toLowerCase();
  
  // Check for country-specific TLDs
  for (const [tld, info] of Object.entries(EMAIL_DOMAINS)) {
    if (lowerEmail.endsWith(tld)) {
      return info;
    }
  }

  return null;
}

// Detect country and region from destination (phone or email)
export function detectRegion(destination: string): { country: string; code: string; region: string } | null {
  if (!destination) return null;

  // Check if it's a phone number (starts with + or is all digits)
  if (destination.startsWith('+') || /^\d+$/.test(destination.replace(/[\s-]/g, ''))) {
    return detectFromPhone(destination);
  }

  // Check if it's an email
  if (destination.includes('@')) {
    return detectFromEmail(destination);
  }

  return null;
}

// Map region names for dashboard display (consolidate Southern Africa into South Africa for simplicity)
export function normalizeRegionForDisplay(region: string | null): string {
  if (!region) return 'Other';
  
  const regionMap: Record<string, string> = {
    'West Africa': 'West Africa',
    'East Africa': 'East Africa',
    'North Africa': 'North Africa',
    'Southern Africa': 'South Africa',
    'Central Africa': 'Central Africa',
  };

  return regionMap[region] || 'Other';
}

// Get all African regions
export const AFRICAN_REGIONS = [
  'West Africa',
  'East Africa', 
  'North Africa',
  'South Africa',
  'Central Africa',
  'Other'
] as const;

export type AfricanRegion = typeof AFRICAN_REGIONS[number];
