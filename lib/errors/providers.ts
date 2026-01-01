/**
 * Provider-Specific Error Mappers
 * 
 * Each provider has its own error codes and messages.
 * These mappers convert provider errors into our standardized ProviderError format.
 */

import { ProviderError, ErrorSeverity } from './handler';

/**
 * Map DataMart (data bundles) errors
 */
export function mapDataMartError(error: unknown): ProviderError {
  const errorMessage = getErrorMessage(error);
  const errorCode = getErrorCode(error);
  
  // Wallet/Balance depleted
  if (
    errorMessage.includes('insufficient') || 
    errorMessage.includes('balance') ||
    errorMessage.includes('wallet') ||
    errorCode === 'INSUFFICIENT_FUNDS'
  ) {
    return new ProviderError(
      'DataMart wallet depleted - needs top-up',
      'datamart',
      error,
      'critical',
      false
    );
  }
  
  // API key invalid or expired
  if (
    errorMessage.includes('unauthorized') || 
    errorMessage.includes('api key') ||
    errorMessage.includes('authentication') ||
    errorCode === 'UNAUTHORIZED' ||
    errorCode === 'AUTH_FAILED'
  ) {
    return new ProviderError(
      'DataMart API key invalid or expired',
      'datamart',
      error,
      'critical',
      false
    );
  }
  
  // Account suspended
  if (
    errorMessage.includes('suspended') ||
    errorMessage.includes('disabled') ||
    errorCode === 'ACCOUNT_SUSPENDED'
  ) {
    return new ProviderError(
      'DataMart account suspended',
      'datamart',
      error,
      'critical',
      false
    );
  }
  
  // Service temporarily down
  if (
    errorMessage.includes('timeout') || 
    errorMessage.includes('503') ||
    errorMessage.includes('502') ||
    errorMessage.includes('unavailable') ||
    errorCode === 'SERVICE_UNAVAILABLE'
  ) {
    return new ProviderError(
      'DataMart service temporarily unavailable',
      'datamart',
      error,
      'high',
      true // Retryable
    );
  }
  
  // Rate limit
  if (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many requests') ||
    errorCode === 'RATE_LIMIT'
  ) {
    return new ProviderError(
      'DataMart rate limit exceeded',
      'datamart',
      error,
      'high',
      true
    );
  }
  
  // Network not supported
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('operator') ||
    errorCode === 'UNSUPPORTED_NETWORK'
  ) {
    return new ProviderError(
      'DataMart: Network/operator not supported',
      'datamart',
      error,
      'medium',
      false
    );
  }
  
  // Generic error
  return new ProviderError(
    `DataMart error: ${errorMessage}`,
    'datamart',
    error,
    'medium',
    false
  );
}

/**
 * Map Reloadly (data bundles/airtime) errors
 */
export function mapReloadlyError(error: unknown): ProviderError {
  const errorMessage = getErrorMessage(error);
  const errorCode = getErrorCode(error);
  
  // Insufficient balance
  if (
    errorMessage.includes('insufficient') ||
    errorMessage.includes('balance') ||
    errorCode === 'INSUFFICIENT_BALANCE'
  ) {
    return new ProviderError(
      'Reloadly wallet balance depleted - needs top-up',
      'reloadly',
      error,
      'critical',
      false
    );
  }
  
  // Invalid credentials
  if (
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('invalid token') ||
    errorMessage.includes('access token') ||
    errorCode === 'UNAUTHORIZED'
  ) {
    return new ProviderError(
      'Reloadly authentication failed - check API credentials',
      'reloadly',
      error,
      'critical',
      false
    );
  }
  
  // Account issues
  if (
    errorMessage.includes('account') ||
    errorMessage.includes('suspended') ||
    errorCode === 'ACCOUNT_ISSUE'
  ) {
    return new ProviderError(
      'Reloadly account issue - check account status',
      'reloadly',
      error,
      'critical',
      false
    );
  }
  
  // Invalid operator/product
  if (
    errorMessage.includes('operator') ||
    errorMessage.includes('product') ||
    errorMessage.includes('not found') ||
    errorCode === 'INVALID_OPERATOR'
  ) {
    return new ProviderError(
      'Reloadly: Invalid operator or product',
      'reloadly',
      error,
      'medium',
      false
    );
  }
  
  // Service unavailable
  if (
    errorMessage.includes('unavailable') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('503')
  ) {
    return new ProviderError(
      'Reloadly service temporarily unavailable',
      'reloadly',
      error,
      'high',
      true
    );
  }
  
  // Transaction failed
  if (
    errorMessage.includes('transaction') ||
    errorMessage.includes('failed')
  ) {
    return new ProviderError(
      `Reloadly transaction failed: ${errorMessage}`,
      'reloadly',
      error,
      'high',
      true
    );
  }
  
  return new ProviderError(
    `Reloadly error: ${errorMessage}`,
    'reloadly',
    error,
    'medium',
    false
  );
}

/**
 * Map Twilio (SMS) errors
 * Reference: https://www.twilio.com/docs/api/errors
 */
export function mapTwilioError(error: unknown): ProviderError {
  const errorMessage = getErrorMessage(error);
  const code = getErrorCode(error);
  
  // Account suspended or authentication failed (20003)
  if (code === '20003') {
    return new ProviderError(
      'Twilio account authentication failed',
      'twilio',
      error,
      'critical',
      false
    );
  }
  
  // Insufficient funds (20429)
  if (
    code === '20429' || 
    errorMessage.includes('balance') ||
    errorMessage.includes('funds')
  ) {
    return new ProviderError(
      'Twilio account balance depleted',
      'twilio',
      error,
      'critical',
      false
    );
  }
  
  // Rate limit exceeded (29)
  if (code === '29' || errorMessage.includes('rate limit')) {
    return new ProviderError(
      'Twilio rate limit exceeded',
      'twilio',
      error,
      'high',
      true
    );
  }
  
  // Invalid credentials
  if (
    errorMessage.includes('authenticate') ||
    errorMessage.includes('credentials') ||
    code === '20003'
  ) {
    return new ProviderError(
      'Twilio authentication failed - check credentials',
      'twilio',
      error,
      'critical',
      false
    );
  }
  
  // ============================================
  // FROM NUMBER / SENDER ID ERRORS
  // ============================================
  
  // Invalid 'From' number - not a Twilio number (21659)
  if (code === '21659' || errorMessage.includes('is not a Twilio phone number')) {
    return new ProviderError(
      'The "from" number is not a verified SendComms sender. Remove the "from" parameter to use the default sender, add a verified number in your dashboard, or contact support@sendcomms.com for assistance.',
      'twilio',
      error,
      'medium',
      false
    );
  }
  
  // From number not verified for trial account (21608)
  if (code === '21608' || errorMessage.includes('not verified')) {
    return new ProviderError(
      'The "from" number is not verified. Please add and verify this number in your SendComms dashboard or contact support@sendcomms.com.',
      'twilio',
      error,
      'medium',
      false
    );
  }
  
  // Invalid 'From' phone number format (21211)
  if (code === '21211') {
    return new ProviderError(
      'Invalid "from" phone number format. Please use E.164 format (e.g., +1234567890) or remove the "from" parameter to use the default sender.',
      'twilio',
      error,
      'medium',
      false
    );
  }
  
  // From number not enabled for region (21215)
  if (code === '21215') {
    return new ProviderError(
      'The "from" number is not enabled for this destination region. Remove the "from" parameter to use the default sender, or contact support@sendcomms.com for assistance.',
      'twilio',
      error,
      'medium',
      false
    );
  }
  
  // ============================================
  // MESSAGING SERVICE ERRORS
  // ============================================
  
  // Messaging Service not found (21703)
  if (code === '21703') {
    return new ProviderError(
      'Messaging Service not found - check configuration',
      'twilio',
      error,
      'critical',
      false
    );
  }
  
  // Messaging Service has no phone numbers (21704)
  if (code === '21704') {
    return new ProviderError(
      'Messaging Service has no phone numbers in sender pool',
      'twilio',
      error,
      'critical',
      false
    );
  }
  
  // Cannot determine best sender from Messaging Service (21705)
  if (code === '21705') {
    return new ProviderError(
      'Messaging Service cannot determine best sender for destination',
      'twilio',
      error,
      'high',
      true
    );
  }
  
  // Alphanumeric sender ID not supported in region (21708)
  if (code === '21708') {
    return new ProviderError(
      'Alphanumeric sender ID not supported in destination region',
      'twilio',
      error,
      'medium',
      false
    );
  }
  
  // ============================================
  // TO NUMBER / DESTINATION ERRORS
  // ============================================
  
  // Invalid 'To' phone number (21211, 21614)
  if (code === '21614' || (code === '21211' && errorMessage.includes('To'))) {
    return new ProviderError(
      'Invalid destination phone number format',
      'twilio',
      error,
      'medium',
      false
    );
  }
  
  // To number is on do-not-contact list (21610)
  if (code === '21610') {
    return new ProviderError(
      'Recipient has opted out of receiving messages',
      'twilio',
      error,
      'medium',
      false
    );
  }
  
  // ============================================
  // MESSAGE DELIVERY ERRORS
  // ============================================
  
  // Queue overflow (30001)
  if (code === '30001') {
    return new ProviderError(
      'Twilio queue capacity exceeded',
      'twilio',
      error,
      'high',
      true
    );
  }
  
  // Account suspended (30002)
  if (code === '30002') {
    return new ProviderError(
      'Twilio account suspended',
      'twilio',
      error,
      'critical',
      false
    );
  }
  
  // Unreachable destination (30003)
  if (code === '30003') {
    return new ProviderError(
      'Twilio: Destination number unreachable',
      'twilio',
      error,
      'medium',
      false
    );
  }
  
  // Message blocked by carrier (30004)
  if (code === '30004') {
    return new ProviderError(
      'Twilio: Message blocked by carrier',
      'twilio',
      error,
      'medium',
      false
    );
  }
  
  // Unknown destination handset (30005)
  if (code === '30005') {
    return new ProviderError(
      'Twilio: Unknown destination handset',
      'twilio',
      error,
      'medium',
      false
    );
  }
  
  // Landline or unreachable carrier (30006)
  if (code === '30006') {
    return new ProviderError(
      'Twilio: Destination is a landline or unreachable',
      'twilio',
      error,
      'medium',
      false
    );
  }
  
  // Message blocked / filtered (30007)
  if (code === '30007') {
    return new ProviderError(
      'Twilio: Message blocked by carrier or filtered',
      'twilio',
      error,
      'medium',
      false
    );
  }
  
  // Unknown error (30008)
  if (code === '30008') {
    return new ProviderError(
      'Twilio: Unknown delivery error',
      'twilio',
      error,
      'high',
      true
    );
  }
  
  // ============================================
  // SERVICE AVAILABILITY ERRORS
  // ============================================
  
  // Service unavailable
  if (
    errorMessage.includes('unavailable') ||
    errorMessage.includes('timeout') ||
    code === '503'
  ) {
    return new ProviderError(
      'Twilio service temporarily unavailable',
      'twilio',
      error,
      'high',
      true
    );
  }
  
  // ============================================
  // GENERIC FALLBACK
  // ============================================
  
  return new ProviderError(
    `Twilio error [${code}]: ${errorMessage}`,
    'twilio',
    error,
    'medium',
    false
  );
}

/**
 * Map Termii (SMS) errors
 */
export function mapTermiiError(error: unknown): ProviderError {
  const errorMessage = getErrorMessage(error);
  const errorCode = getErrorCode(error);
  
  // API key issues
  if (
    errorMessage.includes('api key') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('authentication') ||
    errorCode === 'UNAUTHORIZED'
  ) {
    return new ProviderError(
      'Termii API key invalid or expired',
      'termii',
      error,
      'critical',
      false
    );
  }
  
  // Insufficient balance
  if (
    errorMessage.includes('balance') ||
    errorMessage.includes('insufficient') ||
    errorMessage.includes('credit')
  ) {
    return new ProviderError(
      'Termii account balance depleted',
      'termii',
      error,
      'critical',
      false
    );
  }
  
  // Account suspended
  if (
    errorMessage.includes('suspended') ||
    errorMessage.includes('disabled')
  ) {
    return new ProviderError(
      'Termii account suspended',
      'termii',
      error,
      'critical',
      false
    );
  }
  
  // Rate limit
  if (
    errorMessage.includes('rate') ||
    errorMessage.includes('limit') ||
    errorMessage.includes('throttle')
  ) {
    return new ProviderError(
      'Termii rate limit exceeded',
      'termii',
      error,
      'high',
      true
    );
  }
  
  // Service down
  if (
    errorMessage.includes('unavailable') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('503')
  ) {
    return new ProviderError(
      'Termii service temporarily unavailable',
      'termii',
      error,
      'high',
      true
    );
  }
  
  // Invalid sender ID
  if (
    errorMessage.includes('sender') ||
    errorMessage.includes('sender_id')
  ) {
    return new ProviderError(
      'Termii: Invalid sender ID configuration',
      'termii',
      error,
      'high',
      false
    );
  }
  
  return new ProviderError(
    `Termii error: ${errorMessage}`,
    'termii',
    error,
    'medium',
    false
  );
}

/**
 * Map Hubtel (SMS for Ghana) errors
 */
export function mapHubtelError(error: unknown): ProviderError {
  const errorMessage = getErrorMessage(error);
  const errorCode = getErrorCode(error);
  
  // Authentication issues
  if (
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('authentication') ||
    errorMessage.includes('credentials') ||
    errorCode === '401'
  ) {
    return new ProviderError(
      'Hubtel authentication failed - check API credentials',
      'hubtel',
      error,
      'critical',
      false
    );
  }
  
  // Insufficient balance
  if (
    errorMessage.includes('balance') ||
    errorMessage.includes('insufficient') ||
    errorMessage.includes('credit')
  ) {
    return new ProviderError(
      'Hubtel account balance depleted',
      'hubtel',
      error,
      'critical',
      false
    );
  }
  
  // Account suspended
  if (
    errorMessage.includes('suspended') ||
    errorMessage.includes('disabled') ||
    errorMessage.includes('blocked')
  ) {
    return new ProviderError(
      'Hubtel account suspended or blocked',
      'hubtel',
      error,
      'critical',
      false
    );
  }
  
  // Rate limit
  if (
    errorMessage.includes('rate') ||
    errorMessage.includes('limit') ||
    errorCode === '429'
  ) {
    return new ProviderError(
      'Hubtel rate limit exceeded',
      'hubtel',
      error,
      'high',
      true
    );
  }
  
  // Service down
  if (
    errorMessage.includes('unavailable') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('503') ||
    errorMessage.includes('502')
  ) {
    return new ProviderError(
      'Hubtel service temporarily unavailable',
      'hubtel',
      error,
      'high',
      true
    );
  }
  
  return new ProviderError(
    `Hubtel error: ${errorMessage}`,
    'hubtel',
    error,
    'medium',
    false
  );
}

/**
 * Map Resend (Email) errors
 */
export function mapResendError(error: unknown): ProviderError {
  const errorMessage = getErrorMessage(error);
  const errorCode = getErrorCode(error);
  
  // Daily limit exceeded
  if (
    errorMessage.includes('limit') ||
    errorMessage.includes('quota') ||
    errorMessage.includes('exceeded') ||
    errorCode === 'rate_limit_exceeded'
  ) {
    return new ProviderError(
      'Resend daily sending limit exceeded',
      'resend',
      error,
      'critical',
      false
    );
  }
  
  // Invalid API key
  if (
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('api key') ||
    errorMessage.includes('invalid key') ||
    errorCode === 'unauthorized'
  ) {
    return new ProviderError(
      'Resend API key invalid or expired',
      'resend',
      error,
      'critical',
      false
    );
  }
  
  // Domain not verified
  if (
    errorMessage.includes('domain') ||
    errorMessage.includes('verify') ||
    errorMessage.includes('not verified')
  ) {
    return new ProviderError(
      'Resend domain not verified or invalid',
      'resend',
      error,
      'high',
      false
    );
  }
  
  // Account suspended
  if (
    errorMessage.includes('suspended') ||
    errorMessage.includes('disabled')
  ) {
    return new ProviderError(
      'Resend account suspended',
      'resend',
      error,
      'critical',
      false
    );
  }
  
  // Service unavailable
  if (
    errorMessage.includes('unavailable') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('503')
  ) {
    return new ProviderError(
      'Resend service temporarily unavailable',
      'resend',
      error,
      'high',
      true
    );
  }
  
  // Validation error (from address, etc.)
  if (
    errorMessage.includes('validation') ||
    errorMessage.includes('invalid')
  ) {
    return new ProviderError(
      `Resend validation error: ${errorMessage}`,
      'resend',
      error,
      'medium',
      false
    );
  }
  
  return new ProviderError(
    `Resend error: ${errorMessage}`,
    'resend',
    error,
    'medium',
    false
  );
}

/**
 * Generic provider error mapper - use when provider is unknown
 */
export function mapGenericProviderError(provider: string, error: unknown): ProviderError {
  const errorMessage = getErrorMessage(error);
  
  // Check for common patterns
  if (
    errorMessage.includes('balance') ||
    errorMessage.includes('insufficient') ||
    errorMessage.includes('funds')
  ) {
    return new ProviderError(
      `${provider}: Account balance depleted`,
      provider as any,
      error,
      'critical',
      false
    );
  }
  
  if (
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('authentication') ||
    errorMessage.includes('api key')
  ) {
    return new ProviderError(
      `${provider}: Authentication failed`,
      provider as any,
      error,
      'critical',
      false
    );
  }
  
  if (
    errorMessage.includes('suspended') ||
    errorMessage.includes('disabled')
  ) {
    return new ProviderError(
      `${provider}: Account suspended`,
      provider as any,
      error,
      'critical',
      false
    );
  }
  
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('unavailable')
  ) {
    return new ProviderError(
      `${provider}: Service temporarily unavailable`,
      provider as any,
      error,
      'high',
      true
    );
  }
  
  return new ProviderError(
    `${provider} error: ${errorMessage}`,
    provider as any,
    error,
    'medium',
    false
  );
}

// Helper functions

function getErrorMessage(error: unknown): string {
  if (!error) return 'Unknown error';
  
  if (typeof error === 'string') return error;
  
  if (error instanceof Error) return error.message;
  
  if (typeof error === 'object') {
    const err = error as Record<string, unknown>;
    return (
      (err.message as string) ||
      (err.error as string) ||
      (err.errorMessage as string) ||
      (err.error_message as string) ||
      JSON.stringify(error)
    );
  }
  
  return String(error);
}

function getErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  
  const err = error as Record<string, unknown>;
  const code = err.code || err.errorCode || err.error_code || err.status || '';
  
  return String(code);
}
