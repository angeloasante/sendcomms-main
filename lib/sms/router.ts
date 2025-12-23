// lib/sms/router.ts
// Smart SMS Provider Routing

import { sendTwilio } from './twilio';
import { sendTermii } from './termii';

export type SMSProvider = 'twilio' | 'termii';
export type Continent = 'africa' | 'north_america' | 'south_america' | 'europe' | 'asia' | 'oceania' | 'global';

// African country codes
export const AFRICAN_COUNTRY_CODES = [
  '20',   // Egypt
  '27',   // South Africa
  '211',  // South Sudan
  '212',  // Morocco
  '213',  // Algeria
  '216',  // Tunisia
  '218',  // Libya
  '220',  // Gambia
  '221',  // Senegal
  '222',  // Mauritania
  '223',  // Mali
  '224',  // Guinea
  '225',  // Côte d'Ivoire
  '226',  // Burkina Faso
  '227',  // Niger
  '228',  // Togo
  '229',  // Benin
  '230',  // Mauritius
  '231',  // Liberia
  '232',  // Sierra Leone
  '233',  // Ghana
  '234',  // Nigeria
  '235',  // Chad
  '236',  // Central African Republic
  '237',  // Cameroon
  '238',  // Cape Verde
  '239',  // São Tomé and Príncipe
  '240',  // Equatorial Guinea
  '241',  // Gabon
  '242',  // Republic of the Congo
  '243',  // Democratic Republic of the Congo
  '244',  // Angola
  '245',  // Guinea-Bissau
  '246',  // Diego Garcia
  '247',  // Ascension Island
  '248',  // Seychelles
  '249',  // Sudan
  '250',  // Rwanda
  '251',  // Ethiopia
  '252',  // Somalia
  '253',  // Djibouti
  '254',  // Kenya
  '255',  // Tanzania
  '256',  // Uganda
  '257',  // Burundi
  '258',  // Mozambique
  '260',  // Zambia
  '261',  // Madagascar
  '262',  // Réunion
  '263',  // Zimbabwe
  '264',  // Namibia
  '265',  // Malawi
  '266',  // Lesotho
  '267',  // Botswana
  '268',  // Eswatini
  '269',  // Comoros
  '290',  // Saint Helena
  '291',  // Eritrea
  '297',  // Aruba (Dutch Caribbean but sometimes grouped)
];

// North American country codes
export const NORTH_AMERICAN_CODES = [
  '1',    // USA, Canada, Caribbean
];

// European country codes
export const EUROPEAN_CODES = [
  '30',   // Greece
  '31',   // Netherlands
  '32',   // Belgium
  '33',   // France
  '34',   // Spain
  '36',   // Hungary
  '39',   // Italy
  '40',   // Romania
  '41',   // Switzerland
  '43',   // Austria
  '44',   // UK
  '45',   // Denmark
  '46',   // Sweden
  '47',   // Norway
  '48',   // Poland
  '49',   // Germany
  '350',  // Gibraltar
  '351',  // Portugal
  '352',  // Luxembourg
  '353',  // Ireland
  '354',  // Iceland
  '355',  // Albania
  '356',  // Malta
  '357',  // Cyprus
  '358',  // Finland
  '359',  // Bulgaria
  '370',  // Lithuania
  '371',  // Latvia
  '372',  // Estonia
  '373',  // Moldova
  '374',  // Armenia
  '375',  // Belarus
  '376',  // Andorra
  '377',  // Monaco
  '378',  // San Marino
  '380',  // Ukraine
  '381',  // Serbia
  '382',  // Montenegro
  '383',  // Kosovo
  '385',  // Croatia
  '386',  // Slovenia
  '387',  // Bosnia
  '389',  // North Macedonia
  '420',  // Czech Republic
  '421',  // Slovakia
  '423',  // Liechtenstein
];

// Asian country codes
export const ASIAN_CODES = [
  '60',   // Malaysia
  '61',   // Australia (Oceania but often grouped)
  '62',   // Indonesia
  '63',   // Philippines
  '64',   // New Zealand (Oceania)
  '65',   // Singapore
  '66',   // Thailand
  '81',   // Japan
  '82',   // South Korea
  '84',   // Vietnam
  '86',   // China
  '91',   // India
  '92',   // Pakistan
  '93',   // Afghanistan
  '94',   // Sri Lanka
  '95',   // Myanmar
  '960',  // Maldives
  '961',  // Lebanon
  '962',  // Jordan
  '963',  // Syria
  '964',  // Iraq
  '965',  // Kuwait
  '966',  // Saudi Arabia
  '967',  // Yemen
  '968',  // Oman
  '970',  // Palestine
  '971',  // UAE
  '972',  // Israel
  '973',  // Bahrain
  '974',  // Qatar
  '975',  // Bhutan
  '976',  // Mongolia
  '977',  // Nepal
  '992',  // Tajikistan
  '993',  // Turkmenistan
  '994',  // Azerbaijan
  '995',  // Georgia
  '996',  // Kyrgyzstan
  '998',  // Uzbekistan
];

// Country code to name mapping for common countries
export const COUNTRY_NAMES: Record<string, string> = {
  '1': 'United States / Canada',
  '20': 'Egypt',
  '27': 'South Africa',
  '30': 'Greece',
  '31': 'Netherlands',
  '32': 'Belgium',
  '33': 'France',
  '34': 'Spain',
  '44': 'United Kingdom',
  '49': 'Germany',
  '60': 'Malaysia',
  '61': 'Australia',
  '62': 'Indonesia',
  '63': 'Philippines',
  '65': 'Singapore',
  '81': 'Japan',
  '82': 'South Korea',
  '86': 'China',
  '91': 'India',
  '220': 'Gambia',
  '221': 'Senegal',
  '225': 'Côte d\'Ivoire',
  '233': 'Ghana',
  '234': 'Nigeria',
  '237': 'Cameroon',
  '254': 'Kenya',
  '255': 'Tanzania',
  '256': 'Uganda',
};

/**
 * Extract country code from phone number
 */
export function extractCountryCode(phoneNumber: string): string {
  // Remove + prefix and any spaces/dashes
  const cleaned = phoneNumber.replace(/[\s\-\+]/g, '');
  
  // Try matching longest codes first (3 digits), then 2, then 1
  for (const code of AFRICAN_COUNTRY_CODES) {
    if (cleaned.startsWith(code)) return code;
  }
  for (const code of EUROPEAN_CODES) {
    if (cleaned.startsWith(code)) return code;
  }
  for (const code of ASIAN_CODES) {
    if (cleaned.startsWith(code)) return code;
  }
  for (const code of NORTH_AMERICAN_CODES) {
    if (cleaned.startsWith(code)) return code;
  }
  
  // Fallback: return first 1-3 digits
  if (cleaned.length >= 3) {
    // Check 3-digit codes
    const threeDigit = cleaned.substring(0, 3);
    if (parseInt(threeDigit) >= 200) return threeDigit;
    
    // Check 2-digit codes
    const twoDigit = cleaned.substring(0, 2);
    if (parseInt(twoDigit) >= 20) return twoDigit;
    
    // Single digit (country code 1)
    return cleaned.substring(0, 1);
  }
  
  return cleaned.substring(0, 2);
}

/**
 * Detect continent from phone number or explicit continent parameter
 */
export function detectContinent(phoneNumber: string): Continent {
  const countryCode = extractCountryCode(phoneNumber);
  
  if (AFRICAN_COUNTRY_CODES.includes(countryCode)) {
    return 'africa';
  }
  if (NORTH_AMERICAN_CODES.includes(countryCode)) {
    return 'north_america';
  }
  if (EUROPEAN_CODES.includes(countryCode)) {
    return 'europe';
  }
  if (ASIAN_CODES.includes(countryCode)) {
    return 'asia';
  }
  
  return 'global';
}

/**
 * Get optimal provider based on continent/region
 */
export function getProvider(phoneNumber: string, preferredContinent?: Continent): SMSProvider {
  const continent = preferredContinent || detectContinent(phoneNumber);
  
  // Route Africa to Termii (cheaper for African countries)
  if (continent === 'africa') {
    // Check if Termii is configured
    const termiiKey = process.env.TERMII_API_KEY;
    if (termiiKey && termiiKey !== 'your_termii_api_key') {
      return 'termii';
    }
    // Fallback to Twilio if Termii not configured
    return 'twilio';
  }
  
  // Route everything else to Twilio
  return 'twilio';
}

/**
 * Get country name from phone number
 */
export function getCountryFromPhone(phoneNumber: string): string {
  const countryCode = extractCountryCode(phoneNumber);
  return COUNTRY_NAMES[countryCode] || `Country +${countryCode}`;
}

/**
 * SMS pricing based on provider and country
 */
export interface SMSPricing {
  countryCode: string;
  countryName: string;
  provider: SMSProvider;
  costPerMessage: number;   // What we pay
  pricePerMessage: number;  // What we charge (15% markup)
  currency: string;
  continent: Continent;
}

/**
 * Get SMS pricing for a phone number
 */
export function getSMSPricing(phoneNumber: string): SMSPricing {
  const countryCode = extractCountryCode(phoneNumber);
  const continent = detectContinent(phoneNumber);
  const provider = getProvider(phoneNumber);
  
  // Base costs per provider
  let costPerMessage: number;
  
  if (provider === 'termii') {
    // Termii flat rate for Africa
    costPerMessage = 0.025;
  } else {
    // Twilio varies by country
    const twilioPricing: Record<string, number> = {
      '1': 0.0079,    // US/Canada
      '44': 0.0400,   // UK
      '233': 0.0531,  // Ghana (via Twilio)
      '234': 0.0450,  // Nigeria
      '254': 0.0380,  // Kenya
      '27': 0.0280,   // South Africa
    };
    costPerMessage = twilioPricing[countryCode] || 0.0500;
  }
  
  // Apply 15% markup
  const pricePerMessage = Number((costPerMessage * 1.15).toFixed(6));
  
  return {
    countryCode,
    countryName: COUNTRY_NAMES[countryCode] || `Country +${countryCode}`,
    provider,
    costPerMessage,
    pricePerMessage,
    currency: 'USD',
    continent,
  };
}

interface SMSSendResult {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
  provider: SMSProvider;
  segments?: number;
}

/**
 * Send SMS with automatic provider routing and fallback
 */
export async function sendSMS(
  to: string,
  message: string,
  from?: string,
  preferredContinent?: Continent
): Promise<SMSSendResult> {
  const primaryProvider = getProvider(to, preferredContinent);
  
  try {
    // Try primary provider
    if (primaryProvider === 'termii') {
      const result = await sendTermii(to, message, from);
      if (result.success) {
        return { ...result, provider: 'termii' };
      }
      // If Termii fails, fall back to Twilio
      console.log('Termii failed, falling back to Twilio');
      const fallback = await sendTwilio(to, message, from);
      return { ...fallback, provider: 'twilio' };
    } else {
      const result = await sendTwilio(to, message, from);
      if (result.success) {
        return { ...result, provider: 'twilio' };
      }
      // If Twilio fails for Africa, try Termii
      const continent = detectContinent(to);
      if (continent === 'africa') {
        console.log('Twilio failed for Africa, trying Termii');
        const fallback = await sendTermii(to, message, from);
        return { ...fallback, provider: 'termii' };
      }
      // No fallback for non-Africa
      return { ...result, provider: 'twilio' };
    }
  } catch (error) {
    console.error('SMS send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      provider: primaryProvider,
    };
  }
}
