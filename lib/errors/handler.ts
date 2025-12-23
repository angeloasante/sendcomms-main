/**
 * Error Handler Utility
 * 
 * Centralized error handling system that:
 * - Classifies errors (customer vs provider vs system)
 * - Logs full error details internally
 * - Returns sanitized messages to customers
 * - Triggers escalation for critical errors
 */

import { createAdminClient } from '@/lib/supabase/server';
import { escalateError } from '@/lib/escalation';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ServiceType = 'email' | 'sms' | 'data' | 'airtime';
export type ProviderType = 'resend' | 'twilio' | 'termii' | 'datamart' | 'reloadly' | 'hubtel';

export interface ErrorContext {
  service: ServiceType;
  provider: ProviderType;
  customer_id: string;
  transaction_id?: string;
  request: Record<string, unknown>;
  error: unknown;
}

/**
 * Custom error class for provider-related errors
 * These are errors from external service providers that should be hidden from customers
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: ProviderType,
    public originalError: unknown,
    public severity: ErrorSeverity = 'high',
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ProviderError';
    
    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProviderError);
    }
  }
}

/**
 * Custom error class for customer-related errors
 * These errors can be safely shown to the customer
 */
export class CustomerError extends Error {
  constructor(
    message: string,
    public code: string,
    public httpStatus: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CustomerError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CustomerError);
    }
  }
}

/**
 * Custom error class for system errors
 * Internal errors that should never be exposed to customers
 */
export class SystemError extends Error {
  constructor(
    message: string,
    public originalError: unknown,
    public component: string
  ) {
    super(message);
    this.name = 'SystemError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SystemError);
    }
  }
}

interface HandleProviderErrorResult {
  customerMessage: string;
  customerCode: string;
  httpStatus: number;
  shouldEscalate: boolean;
  errorId: string;
}

/**
 * Main error handler for provider errors
 * - Logs the full error to database
 * - Escalates if needed
 * - Returns a sanitized message for the customer
 */
export async function handleProviderError(
  context: ErrorContext,
  error: ProviderError
): Promise<HandleProviderErrorResult> {
  const errorId = generateErrorId();
  const timestamp = new Date().toISOString();
  
  // Log full error details to console (for server logs)
  console.error('[Provider Error]', {
    errorId,
    timestamp,
    service: context.service,
    provider: context.provider,
    customer_id: context.customer_id,
    transaction_id: context.transaction_id,
    severity: error.severity,
    message: error.message,
    originalError: sanitizeErrorForLog(error.originalError)
  });
  
  // Save to database for tracking
  try {
    const supabase = createAdminClient();
    await supabase.from('provider_errors').insert({
      id: errorId,
      service: context.service,
      provider: context.provider,
      customer_id: context.customer_id,
      transaction_id: context.transaction_id,
      error_type: error.name,
      error_message: error.message,
      error_details: sanitizeErrorForLog(error.originalError),
      severity: error.severity,
      retryable: error.retryable,
      request_data: sanitizeRequestData(context.request),
      created_at: timestamp
    });
  } catch (dbError) {
    // Don't let DB errors prevent customer response
    console.error('[Error Logging Failed]', dbError);
  }
  
  // Determine if escalation needed
  const shouldEscalate = error.severity === 'critical' || error.severity === 'high';
  
  if (shouldEscalate) {
    // Fire and forget - don't block customer response
    escalateError(context, error, errorId).catch(escError => {
      console.error('[Escalation Failed]', escError);
    });
  }
  
  // Return generic customer-facing message
  return {
    customerMessage: getCustomerMessage(context.service, error),
    customerCode: getCustomerErrorCode(context.service),
    httpStatus: 503, // Service Unavailable for provider errors
    shouldEscalate,
    errorId
  };
}

/**
 * Handle system errors (database, redis, etc.)
 */
export async function handleSystemError(
  component: string,
  error: SystemError,
  context?: Partial<ErrorContext>
): Promise<HandleProviderErrorResult> {
  const errorId = generateErrorId();
  const timestamp = new Date().toISOString();
  
  console.error('[System Error]', {
    errorId,
    timestamp,
    component,
    message: error.message,
    stack: error.stack,
    originalError: sanitizeErrorForLog(error.originalError)
  });
  
  // Always escalate system errors
  try {
    const supabase = createAdminClient();
    await supabase.from('provider_errors').insert({
      id: errorId,
      service: context?.service || 'system',
      provider: component as ProviderType,
      customer_id: context?.customer_id,
      transaction_id: context?.transaction_id,
      error_type: 'SystemError',
      error_message: error.message,
      error_details: {
        component,
        stack: error.stack,
        originalError: sanitizeErrorForLog(error.originalError)
      },
      severity: 'critical',
      retryable: false,
      request_data: context?.request ? sanitizeRequestData(context.request) : null,
      created_at: timestamp
    });
  } catch (dbError) {
    console.error('[Error Logging Failed]', dbError);
  }
  
  return {
    customerMessage: 'An unexpected error occurred. Please try again later.',
    customerCode: 'INTERNAL_ERROR',
    httpStatus: 500,
    shouldEscalate: true,
    errorId
  };
}

/**
 * Get sanitized customer-facing message based on service type
 * These messages never expose provider details
 */
function getCustomerMessage(service: ServiceType, error: ProviderError): string {
  const baseMessages: Record<ServiceType, string> = {
    email: 'Failed to send email. Please try again in a few minutes.',
    sms: 'Failed to send SMS. Please try again in a few minutes.',
    data: 'Failed to process data bundle purchase. Please try again in a few minutes.',
    airtime: 'Failed to process airtime purchase. Please try again in a few minutes.'
  };
  
  const message = baseMessages[service] || 'Service temporarily unavailable.';
  
  // Add retry hint for retryable errors
  if (error.retryable) {
    return `${message} This is a temporary issue.`;
  }
  
  return `${message} If the issue persists, contact support.`;
}

/**
 * Get standardized error code for customer response
 */
function getCustomerErrorCode(service: ServiceType): string {
  const codes: Record<ServiceType, string> = {
    email: 'EMAIL_SEND_FAILED',
    sms: 'SMS_SEND_FAILED',
    data: 'DATA_PURCHASE_FAILED',
    airtime: 'AIRTIME_PURCHASE_FAILED'
  };
  
  return codes[service] || 'SERVICE_ERROR';
}

/**
 * Generate unique error ID for tracking
 */
function generateErrorId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `err_${timestamp}_${random}`;
}

/**
 * Sanitize error object for safe logging
 * Removes sensitive data that shouldn't be logged
 */
function sanitizeErrorForLog(error: unknown): Record<string, unknown> {
  if (!error) return {};
  
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      // Include any additional properties
      ...Object.fromEntries(
        Object.entries(error).filter(([key]) => 
          !['password', 'apiKey', 'api_key', 'secret', 'token', 'auth'].includes(key.toLowerCase())
        )
      )
    };
  }
  
  if (typeof error === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(error as Record<string, unknown>)) {
      // Skip sensitive fields
      if (['password', 'apiKey', 'api_key', 'secret', 'token', 'auth', 'authorization'].includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeErrorForLog(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  
  return { value: String(error) };
}

/**
 * Sanitize request data to remove sensitive information
 */
function sanitizeRequestData(request: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ['password', 'api_key', 'apiKey', 'secret', 'token', 'authorization', 'auth'];
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(request)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeRequestData(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Check if an error is a customer error (safe to show)
 */
export function isCustomerError(error: unknown): error is CustomerError {
  return error instanceof CustomerError;
}

/**
 * Check if an error is a provider error
 */
export function isProviderError(error: unknown): error is ProviderError {
  return error instanceof ProviderError;
}

/**
 * Check if an error is a system error
 */
export function isSystemError(error: unknown): error is SystemError {
  return error instanceof SystemError;
}

/**
 * Common customer errors - pre-defined for consistency
 */
export const CustomerErrors = {
  insufficientBalance: (required: number, available: number) => 
    new CustomerError(
      `Insufficient balance. Required: $${required.toFixed(4)}, Available: $${available.toFixed(4)}`,
      'INSUFFICIENT_BALANCE',
      402,
      { required, available }
    ),
  
  invalidPhoneNumber: (phone: string) =>
    new CustomerError(
      `Invalid phone number format: ${phone}`,
      'INVALID_PHONE_NUMBER',
      400,
      { phone }
    ),
  
  invalidEmailAddress: (email: string) =>
    new CustomerError(
      `Invalid email address: ${email}`,
      'INVALID_EMAIL',
      400,
      { email }
    ),
  
  messageTooLong: (length: number, maxLength: number) =>
    new CustomerError(
      `Message too long. Maximum ${maxLength} characters allowed, got ${length}`,
      'MESSAGE_TOO_LONG',
      400,
      { length, maxLength }
    ),
  
  rateLimitExceeded: (retryAfter: number) =>
    new CustomerError(
      `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
      'RATE_LIMIT_EXCEEDED',
      429,
      { retryAfter }
    ),
  
  invalidApiKey: () =>
    new CustomerError(
      'Invalid or missing API key',
      'UNAUTHORIZED',
      401
    ),
  
  accountSuspended: () =>
    new CustomerError(
      'Your account has been suspended. Please contact support.',
      'ACCOUNT_SUSPENDED',
      403
    ),
  
  invalidRequest: (details: string) =>
    new CustomerError(
      `Invalid request: ${details}`,
      'INVALID_REQUEST',
      400
    ),
  
  serviceNotAvailable: (service: string) =>
    new CustomerError(
      `${service} service is not available in your region`,
      'SERVICE_NOT_AVAILABLE',
      400
    ),

  packageNotFound: (packageId: string) =>
    new CustomerError(
      `Data package not found: ${packageId}`,
      'PACKAGE_NOT_FOUND',
      404,
      { packageId }
    )
};
