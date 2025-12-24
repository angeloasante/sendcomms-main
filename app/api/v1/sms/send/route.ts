import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { withRateLimit } from '@/lib/rate-limit/middleware';
import {
  validateApiKey,
  logUsage,
  checkBalance,
  deductBalance,
  sendWebhook,
  generateTransactionId,
  errorResponse,
  trackSubscriptionUsage,
} from '@/lib/api-helpers';
import {
  sendSMS,
  getSMSPricing,
  detectContinent,
  extractCountryCode,
  getCountryFromPhone,
  Continent,
} from '@/lib/sms/router';
import {
  handleIdempotency,
  completeIdempotency,
  createIdempotentResponse,
} from '@/lib/idempotency';
import {
  handleProviderError,
  ProviderError,
  CustomerErrors,
  isCustomerError,
} from '@/lib/errors';
import { mapTwilioError, mapTermiiError, mapHubtelError } from '@/lib/errors/providers';
import { isSandboxKey } from '@/lib/sandbox';
import { getSandboxSMSResponse } from '@/lib/sandbox/responses';
import { logTestTransaction } from '@/lib/sandbox/logger';

// Lazy-initialized Supabase client
let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return supabase;
}

/**
 * Validate phone number format
 */
function isValidPhoneNumber(phone: string): boolean {
  // Remove spaces and dashes
  const cleaned = phone.replace(/[\s\-]/g, '');
  // Must start with + and have 8-15 digits
  const phoneRegex = /^\+?[1-9]\d{7,14}$/;
  return phoneRegex.test(cleaned);
}

/**
 * Format phone number to E.164 format
 */
function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[\s\-]/g, '');
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Validate API key
    const keyData = await validateApiKey(request);
    if (!keyData) {
      return errorResponse('Invalid or missing API key', 401, 'UNAUTHORIZED');
    }

    // 2. Check if customer account is active
    if (!keyData.customers.is_active) {
      return errorResponse('Account suspended. Contact support.', 403, 'ACCOUNT_SUSPENDED');
    }

    // 3. Rate limiting
    const rateLimitResult = await withRateLimit(
      request,
      keyData.customer_id,
      keyData.customers.plan,
      'sms'
    );

    if (rateLimitResult instanceof NextResponse) {
      return rateLimitResult;
    }

    // 4. Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400, 'INVALID_JSON');
    }

    const {
      to,
      message,
      from,
      reference,
      continent,       // Optional: 'africa', 'north_america', 'europe', 'asia', 'global'
      idempotency_key,
    } = body;

    // Required fields validation
    if (!to) {
      return errorResponse('Missing required field: to', 400, 'MISSING_FIELD');
    }

    if (!message) {
      return errorResponse('Missing required field: message', 400, 'MISSING_FIELD');
    }

    // Validate phone number
    if (!isValidPhoneNumber(to)) {
      return errorResponse(
        'Invalid phone number. Use E.164 format (e.g., +233540800994)',
        400,
        'INVALID_PHONE_NUMBER'
      );
    }

    // Validate message length
    if (message.length > 1600) {
      return errorResponse(
        'Message too long. Maximum 1600 characters (10 SMS segments)',
        400,
        'MESSAGE_TOO_LONG'
      );
    }

    // Validate continent if provided
    const validContinents: Continent[] = ['africa', 'north_america', 'south_america', 'europe', 'asia', 'oceania', 'global'];
    if (continent && !validContinents.includes(continent)) {
      return errorResponse(
        `Invalid continent. Must be one of: ${validContinents.join(', ')}`,
        400,
        'INVALID_CONTINENT'
      );
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(to);

    // Extract API key from header for sandbox check
    const authHeader = request.headers.get('Authorization');
    const apiKey = authHeader?.replace('Bearer ', '').trim() || '';

    // 5. SANDBOX MODE CHECK - Return mock response for test keys
    if (isSandboxKey(apiKey)) {
      const mockResponse = getSandboxSMSResponse({
        to: formattedPhone,
        message,
        from,
        reference
      });

      // Log test transaction (fire and forget)
      logTestTransaction({
        customer_id: keyData.customer_id,
        api_key_id: keyData.id,
        service: 'sms',
        endpoint: '/api/v1/sms/send',
        request_body: { to: formattedPhone, message, from, reference },
        response_body: mockResponse,
        transaction_id: mockResponse.transaction_id,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        user_agent: request.headers.get('user-agent') || undefined
      }).catch(err => console.error('[Sandbox Log Error]', err));

      return NextResponse.json({
        success: true,
        data: mockResponse
      }, {
        headers: rateLimitResult.headers
      });
    }

    // 6. Check for duplicate request (idempotency) - using Redis
    if (idempotency_key) {
      const idempotencyResult = await handleIdempotency(
        keyData.customer_id,
        idempotency_key,
        'sms'
      );

      if (!idempotencyResult.shouldProcess) {
        if (idempotencyResult.isLocked) {
          return NextResponse.json({
            success: false,
            error: {
              code: 'REQUEST_IN_PROGRESS',
              message: 'Request is being processed. Please wait.',
            },
          }, {
            status: 409,
            headers: rateLimitResult.headers,
          });
        }

        // Return cached response from Redis
        const cached = createIdempotentResponse(idempotencyResult.cachedResponse);
        return NextResponse.json(cached.body, {
          headers: { ...Object.fromEntries(cached.headers), ...rateLimitResult.headers },
        });
      }
    }

    // 6. Get pricing and determine provider
    const pricing = getSMSPricing(formattedPhone);
    const detectedContinent = continent || detectContinent(formattedPhone);
    const countryCode = extractCountryCode(formattedPhone);
    const countryName = getCountryFromPhone(formattedPhone);

    // Calculate segments
    const hasUnicode = /[^\x00-\x7F]/.test(message);
    const maxCharsPerSegment = hasUnicode ? 70 : 160;
    const segments = Math.ceil(message.length / maxCharsPerSegment);

    // Total price based on segments
    const cost = pricing.costPerMessage * segments;
    const price = pricing.pricePerMessage * segments;
    const margin = price - cost;

    // 7. Check balance
    try {
      await checkBalance(keyData.customer_id, price);
    } catch (error) {
      if (error instanceof Error && error.message === 'Insufficient balance') {
        return errorResponse(
          'Insufficient balance. Please add funds to your account.',
          402,
          'INSUFFICIENT_BALANCE',
          { required: price, currency: 'USD' }
        );
      }
      throw error;
    }

    // 8. Create transaction record (pending)
    const transactionId = generateTransactionId('sms');

    const { error: txError } = await getSupabase()
      .from('transactions')
      .insert({
        id: transactionId,
        customer_id: keyData.customer_id,
        api_key_id: keyData.id,
        type: 'sms',
        status: 'pending',
        provider: pricing.provider,
        destination: formattedPhone,
        recipient_count: 1,
        country: countryCode,
        region: detectedContinent,
        request_data: {
          to: formattedPhone,
          message,
          from: from || null,
          segments,
          message_length: message.length,
          reference,
        },
        cost,
        price,
        margin,
        idempotency_key: idempotency_key || null,
        created_at: new Date().toISOString(),
      });

    if (txError) {
      console.error('Failed to create transaction:', txError);
    }

    // 9. Log API usage
    await logUsage(keyData.customer_id, keyData.id, '/api/v1/sms/send', 'POST');

    // 10. Send SMS via provider (with auto-routing and fallback)
    const result = await sendSMS(formattedPhone, message, from, continent);

    // 11. Update transaction status
    const status = result.success ? 'sent' : 'failed';
    const now = new Date().toISOString();

    await getSupabase()
      .from('transactions')
      .update({
        status,
        provider: result.provider, // May have changed if fallback was used
        provider_id: result.messageId,
        response_data: {
          success: result.success,
          error: result.error,
          message_id: result.messageId,
          provider: result.provider,
          segments: result.segments || segments,
        },
        sent_at: result.success ? now : null,
        completed_at: status === 'failed' ? now : null,
        processing_time_ms: Date.now() - startTime,
      })
      .eq('id', transactionId);

    // 11b. Log to sms_logs table for dashboard tracking
    try {
      await getSupabase()
        .from('sms_logs')
        .insert({
          customer_id: keyData.customer_id,
          transaction_id: transactionId,
          message_id: result.messageId || null,
          phone_number: formattedPhone,
          message_content: message,
          sender_id: from || null,
          country_code: countryCode,
          country_name: countryName,
          continent: detectedContinent,
          provider: result.provider,
          segments,
          status: result.success ? 'sent' : 'failed',
          cost: cost,
          price: price,
          error_message: result.error || null,
          reference: reference || null,
          api_key_id: keyData.id,
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          user_agent: request.headers.get('user-agent'),
          sent_at: result.success ? now : null,
          created_at: now,
        });
    } catch (err) {
      console.error('Failed to log SMS:', err);
    }

    // 12. Deduct balance if successful
    let remainingSms = 0;
    if (result.success) {
      await deductBalance(keyData.customer_id, price);
      
      // 12b. Track subscription usage for billing
      await trackSubscriptionUsage(keyData.customer_id, 'sms', 1);
      
      // 12c. Get remaining quota
      const { data: sub } = await getSupabase()
        .from('subscriptions')
        .select('sms_used, pricing_plans(sms_limit)')
        .eq('customer_id', keyData.customer_id)
        .single();
      
      if (sub) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const plans = sub.pricing_plans as any;
        const limit = plans?.sms_limit || 50;
        remainingSms = Math.max(0, limit - (sub.sms_used || 0));
      }
    }

    // 13. Send webhook notification (async)
    if (keyData.customers.webhook_url) {
      sendWebhook(
        transactionId,
        keyData.customer_id,
        keyData.customers.webhook_url,
        keyData.customers.webhook_secret,
        {
          event: result.success ? 'sms.sent' : 'sms.failed',
          data: {
            transaction_id: transactionId,
            type: 'sms',
            status,
            to: formattedPhone,
            segments,
            message_id: result.messageId,
            country: countryName,
            region: detectedContinent,
            cost: price,
            error: result.error,
          },
        }
      ).catch(err => console.error('Webhook delivery failed:', err));
    }

    // 14. Return response
    if (!result.success) {
      // Determine if this is a provider error that needs escalation
      const errorStr = result.error || '';
      const isProviderIssue = 
        errorStr.includes('timeout') ||
        errorStr.includes('unavailable') ||
        errorStr.includes('balance') ||
        errorStr.includes('authentication') ||
        errorStr.includes('suspended');

      if (isProviderIssue) {
        // Map and handle as provider error
        let providerError: ProviderError;
        if (result.provider === 'twilio') {
          providerError = mapTwilioError({ message: result.error });
        } else if (result.provider === 'termii') {
          providerError = mapTermiiError({ message: result.error });
        } else {
          providerError = mapHubtelError({ message: result.error });
        }

        // This will log and potentially escalate
        await handleProviderError(
          {
            service: 'sms',
            provider: result.provider as any,
            customer_id: keyData.customer_id,
            transaction_id: transactionId,
            request: { to: formattedPhone, message, from },
            error: { message: result.error, provider: result.provider }
          },
          providerError
        );

        // Return generic message to customer
        return NextResponse.json({
          success: false,
          error: {
            code: 'SMS_SEND_FAILED',
            message: 'Failed to send SMS. Please try again in a few minutes.',
            transaction_id: transactionId,
          },
        }, {
          status: 503,
          headers: rateLimitResult.headers,
        });
      }

      // Non-provider error (e.g., invalid number) - safe to show to customer
      return NextResponse.json({
        success: false,
        error: {
          code: 'SMS_SEND_FAILED',
          message: result.error || 'Failed to send SMS',
          transaction_id: transactionId,
        },
      }, {
        status: 400,
        headers: rateLimitResult.headers,
      });
    }

    // Build success response
    const responseData = {
      transaction_id: transactionId,
      message_id: result.messageId,
      status: 'sent',
      to: formattedPhone,
      message_length: message.length,
      segments,
      country: {
        code: countryCode,
        name: countryName,
      },
      region: detectedContinent,
      remaining: remainingSms,
      quota: {
        used: 1,
        remaining: remainingSms,
      },
      created_at: now,
    };

    // Store idempotency response in Redis
    if (idempotency_key) {
      await completeIdempotency(
        keyData.customer_id,
        idempotency_key,
        'sms',
        responseData,
        200,
        transactionId
      );
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    }, {
      status: 200,
      headers: rateLimitResult.headers,
    });

  } catch (error: unknown) {
    console.error('SMS API Error:', error);

    // Handle customer errors (safe to show to user)
    if (isCustomerError(error)) {
      return errorResponse(
        error.message,
        error.httpStatus,
        error.code,
        error.details
      );
    }

    // Handle known error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage === 'Insufficient balance') {
      return errorResponse(
        'Insufficient balance. Please add funds to your account.',
        402,
        'INSUFFICIENT_BALANCE'
      );
    }

    if (errorMessage === 'Account suspended') {
      return errorResponse(
        'Account suspended. Contact support.',
        403,
        'ACCOUNT_SUSPENDED'
      );
    }

    // Handle provider errors - determine provider from error or default
    let providerError: ProviderError;
    if (error instanceof ProviderError) {
      providerError = error;
    } else {
      // Try to determine provider from error characteristics
      const errStr = String(error);
      if (errStr.includes('twilio') || errStr.includes('Twilio')) {
        providerError = mapTwilioError(error);
      } else if (errStr.includes('termii') || errStr.includes('Termii')) {
        providerError = mapTermiiError(error);
      } else if (errStr.includes('hubtel') || errStr.includes('Hubtel')) {
        providerError = mapHubtelError(error);
      } else {
        // Generic provider error
        providerError = new ProviderError(
          errorMessage,
          'twilio', // Default to twilio
          error,
          'high'
        );
      }
    }

    // Handle the provider error (logs, escalates, returns sanitized message)
    const { customerMessage, customerCode, httpStatus } = await handleProviderError(
      {
        service: 'sms',
        provider: providerError.provider,
        customer_id: 'unknown', // May not have keyData at this point
        request: {},
        error
      },
      providerError
    );

    return errorResponse(customerMessage, httpStatus, customerCode);
  }
}
