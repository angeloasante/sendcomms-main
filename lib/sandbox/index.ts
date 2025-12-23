/**
 * Sandbox Mode Detection & Utilities
 * 
 * Sandbox mode allows developers to test their integration without:
 * - Sending real messages (SMS, Email)
 * - Making real purchases (Data, Airtime)
 * - Incurring any charges
 * 
 * Test keys: sc_test_xxx
 * Live keys: sc_live_xxx
 */

/**
 * Check if an API key is a sandbox/test key
 */
export function isSandboxKey(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') return false;
  return apiKey.startsWith('sc_test_');
}

/**
 * Check if an API key is a live/production key
 */
export function isLiveKey(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') return false;
  return apiKey.startsWith('sc_live_');
}

/**
 * Get the key type for display purposes
 */
export function getKeyType(apiKey: string): 'test' | 'live' | 'unknown' {
  if (isSandboxKey(apiKey)) return 'test';
  if (isLiveKey(apiKey)) return 'live';
  return 'unknown';
}

/**
 * Generate a test API key
 */
export function generateTestApiKey(): string {
  const randomPart = generateRandomString(40);
  return `sc_test_${randomPart}`;
}

/**
 * Generate a live API key
 */
export function generateLiveApiKey(): string {
  const randomPart = generateRandomString(40);
  return `sc_live_${randomPart}`;
}

/**
 * Generate random alphanumeric string
 */
function generateRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Sandbox metadata to include in test responses
 */
export interface SandboxMetadata {
  mode: 'test';
  message: string;
  note?: string;
}

/**
 * Create standard sandbox metadata
 */
export function createSandboxMetadata(service: string): SandboxMetadata {
  const messages: Record<string, string> = {
    sms: 'This is a test transaction. No real SMS was sent.',
    email: 'This is a test transaction. No real email was sent.',
    data: 'This is a test transaction. No real data bundle was purchased.',
    airtime: 'This is a test transaction. No real airtime was purchased.',
  };

  return {
    mode: 'test',
    message: messages[service] || 'This is a test transaction.',
    note: 'Switch to a live API key (sc_live_) to send real messages.'
  };
}
