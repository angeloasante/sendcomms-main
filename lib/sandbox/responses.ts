/**
 * Sandbox Mock Response Generators
 * 
 * These functions generate realistic mock responses for test API keys
 * without actually calling external providers or charging customers.
 */

import { createSandboxMetadata } from './index';

/**
 * Generate a unique ID for sandbox transactions
 */
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}_${random}`;
}

/**
 * Extract country code from phone number
 */
function extractCountryCode(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Common country codes
  const countryCodes: Record<string, string> = {
    '+1': '1',
    '+44': '44',
    '+233': '233',
    '+234': '234',
    '+254': '254',
    '+27': '27',
    '+91': '91',
    '+86': '86',
    '+81': '81',
    '+49': '49',
    '+33': '33',
    '+39': '39',
    '+34': '34',
    '+61': '61',
    '+55': '55',
  };

  for (const [prefix, code] of Object.entries(countryCodes)) {
    if (cleaned.startsWith(prefix)) {
      return code;
    }
  }
  
  // Default to Ghana if we can't detect
  return '233';
}

/**
 * Get country name from phone number
 */
function getCountryName(phone: string): string {
  const code = extractCountryCode(phone);
  
  const countryNames: Record<string, string> = {
    '1': 'United States',
    '44': 'United Kingdom',
    '233': 'Ghana',
    '234': 'Nigeria',
    '254': 'Kenya',
    '27': 'South Africa',
    '91': 'India',
    '86': 'China',
    '81': 'Japan',
    '49': 'Germany',
    '33': 'France',
    '39': 'Italy',
    '34': 'Spain',
    '61': 'Australia',
    '55': 'Brazil',
  };
  
  return countryNames[code] || 'Ghana';
}

/**
 * Detect continent from phone number
 */
function detectContinent(phone: string): string {
  const code = extractCountryCode(phone);
  
  const africaCodes = ['233', '234', '254', '27', '225', '228', '229', '226', '221', '237', '256'];
  const europeCodes = ['44', '49', '33', '39', '34', '31', '32', '41', '43', '46', '47', '48'];
  const asiaCodes = ['91', '86', '81', '82', '65', '60', '66', '62', '63', '84'];
  const northAmericaCodes = ['1'];
  const southAmericaCodes = ['55', '54', '57', '56', '51', '58'];
  const oceaniaCodes = ['61', '64'];
  
  if (africaCodes.includes(code)) return 'africa';
  if (europeCodes.includes(code)) return 'europe';
  if (asiaCodes.includes(code)) return 'asia';
  if (northAmericaCodes.includes(code)) return 'north_america';
  if (southAmericaCodes.includes(code)) return 'south_america';
  if (oceaniaCodes.includes(code)) return 'oceania';
  
  return 'africa';
}

/**
 * Calculate mock SMS price based on region
 */
function calculateSMSPrice(phone: string): number {
  const continent = detectContinent(phone);
  
  const prices: Record<string, number> = {
    'africa': 0.029,
    'europe': 0.046,
    'asia': 0.038,
    'north_america': 0.012,
    'south_america': 0.035,
    'oceania': 0.045,
  };
  
  return prices[continent] || 0.029;
}

/**
 * Calculate mock data price
 */
function calculateDataPrice(network: string, capacityGb: number): number {
  const basePrices: Record<string, number> = {
    'mtn': 4.5,
    'vodafone': 4.2,
    'airteltigo': 4.0,
    'glo': 3.8,
  };
  
  const basePrice = basePrices[network.toLowerCase()] || 4.5;
  return parseFloat((basePrice * capacityGb).toFixed(2));
}

// ============================================
// MOCK RESPONSE GENERATORS
// ============================================

export interface SandboxSMSRequest {
  to: string;
  message: string;
  from?: string;
  reference?: string;
}

export function getSandboxSMSResponse(request: SandboxSMSRequest) {
  const messageLength = request.message.length;
  const segments = Math.ceil(messageLength / 160);
  const pricePerSegment = calculateSMSPrice(request.to);
  
  return {
    transaction_id: `sms_test_${generateId()}`,
    message_id: `SMtest${Math.random().toString(36).substring(2, 11)}`,
    status: 'sent',
    to: request.to,
    from: request.from || 'SendComms',
    message_length: messageLength,
    segments,
    price: {
      amount: parseFloat((pricePerSegment * segments).toFixed(4)),
      currency: 'USD'
    },
    provider: 'sandbox',
    country: {
      code: extractCountryCode(request.to),
      name: getCountryName(request.to)
    },
    region: detectContinent(request.to),
    reference: request.reference || null,
    created_at: new Date().toISOString(),
    _sandbox: createSandboxMetadata('sms')
  };
}

export interface SandboxEmailRequest {
  to: string | string[];
  from: string;
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
}

export function getSandboxEmailResponse(request: SandboxEmailRequest) {
  const recipients = Array.isArray(request.to) ? request.to.length : 1;
  
  return {
    id: `email_test_${generateId()}`,
    email_id: `test_${generateId()}`,
    status: 'sent',
    to: request.to,
    from: request.from,
    subject: request.subject,
    recipients,
    provider: 'sandbox',
    cost: parseFloat((0.001 * recipients).toFixed(4)),
    currency: 'USD',
    created_at: new Date().toISOString(),
    _sandbox: createSandboxMetadata('email')
  };
}

export interface SandboxBatchEmailRequest {
  emails: Array<{
    to: string | string[];
    from?: string;
    subject: string;
    html?: string;
    text?: string;
  }>;
  totalRecipients?: number;
}

export function getSandboxBatchEmailResponse(request: SandboxBatchEmailRequest) {
  const batchId = `batch_test_${generateId()}`;
  const totalRecipients = request.emails.reduce((sum, email) => {
    return sum + (Array.isArray(email.to) ? email.to.length : 1);
  }, 0);
  
  const results = request.emails.map((email, index) => ({
    index,
    email_id: `test_${generateId()}`,
    status: 'sent',
    to: email.to,
    subject: email.subject
  }));
  
  return {
    batch_id: batchId,
    status: 'completed',
    total_emails: request.emails.length,
    total_recipients: totalRecipients,
    successful: request.emails.length,
    failed: 0,
    provider: 'sandbox',
    cost: parseFloat((0.001 * totalRecipients).toFixed(4)),
    currency: 'USD',
    results,
    created_at: new Date().toISOString(),
    _sandbox: createSandboxMetadata('email')
  };
}

export interface SandboxDataRequest {
  phone_number: string;
  network: string;
  capacity_gb: number;
}

export function getSandboxDataResponse(request: SandboxDataRequest) {
  const price = calculateDataPrice(request.network, request.capacity_gb);
  
  return {
    transaction_id: `data_test_${generateId()}`,
    status: 'completed',
    phone_number: request.phone_number,
    network: request.network.toLowerCase(),
    capacity_gb: request.capacity_gb,
    price: {
      amount: price,
      currency: 'GHS'
    },
    provider: 'sandbox',
    provider_reference: `TRX-TEST-${generateId()}`,
    order_reference: `TEST-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    processing_method: 'instant',
    message: 'Test mode: Data bundle order simulated successfully.',
    created_at: new Date().toISOString(),
    _sandbox: createSandboxMetadata('data')
  };
}

export interface SandboxAirtimeRequest {
  phone_number: string;
  amount: number;
  network?: string;
}

export function getSandboxAirtimeResponse(request: SandboxAirtimeRequest) {
  return {
    transaction_id: `airtime_test_${generateId()}`,
    status: 'completed',
    phone_number: request.phone_number,
    amount: request.amount,
    currency: 'GHS',
    network: request.network || 'auto-detected',
    provider: 'sandbox',
    provider_reference: `AIR-TEST-${generateId()}`,
    processing_method: 'instant',
    message: 'Test mode: Airtime topup simulated successfully.',
    created_at: new Date().toISOString(),
    _sandbox: createSandboxMetadata('airtime')
  };
}
