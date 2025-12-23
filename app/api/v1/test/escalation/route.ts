/**
 * Test Endpoint for Escalation System
 * 
 * THIS IS FOR TESTING ONLY - Remove or protect in production
 * 
 * Usage:
 * curl -X POST http://localhost:3000/api/v1/test/escalation \
 *   -H "Authorization: Bearer YOUR_API_KEY" \
 *   -H "Content-Type: application/json" \
 *   -d '{"severity": "critical", "service": "sms", "provider": "twilio"}'
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-helpers';
import { escalateError } from '@/lib/escalation';
import { ProviderError, ErrorContext } from '@/lib/errors/handler';

export async function POST(request: NextRequest) {
  // 1. Validate API key
  const keyData = await validateApiKey(request);
  if (!keyData) {
    return NextResponse.json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid API key' }
    }, { status: 401 });
  }

  // 2. Parse request
  const body = await request.json();
  const { 
    severity = 'critical',
    service = 'sms',
    provider = 'twilio',
    message = 'Test escalation alert - please ignore'
  } = body;

  // 3. Create mock error context
  const context: ErrorContext = {
    service: service as 'sms' | 'email' | 'data' | 'airtime',
    provider: provider as 'twilio' | 'resend' | 'datamart' | 'reloadly' | 'termii' | 'hubtel',
    customer_id: keyData.customer_id,
    transaction_id: `test_${Date.now()}`,
    request: { test: true, timestamp: new Date().toISOString() },
    error: { message: message }
  };

  // 4. Create mock provider error
  const providerError = new ProviderError(
    message,
    provider as 'twilio' | 'resend' | 'datamart' | 'reloadly' | 'termii' | 'hubtel',
    { test: true },
    severity as 'low' | 'medium' | 'high' | 'critical',
    false
  );

  const errorId = `test_err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // 5. Trigger escalation
  console.log(`[Test Escalation] Triggering ${severity} alert for ${service}/${provider}`);
  
  try {
    await escalateError(context, providerError, errorId);
    
    return NextResponse.json({
      success: true,
      data: {
        message: 'Escalation triggered successfully',
        errorId,
        severity,
        service,
        provider,
        channels: ['sms', 'email'],
        admin_phone: process.env.ADMIN_PHONE || '+447555834656',
        admin_emails: (process.env.ADMIN_EMAILS || 'angeloasante958@gmail.com,travis@travisdevelops.com').split(',')
      }
    });
  } catch (error) {
    console.error('[Test Escalation Failed]', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'ESCALATION_FAILED',
        message: error instanceof Error ? error.message : 'Escalation failed',
        details: {
          twilio_configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_NUMBER),
          resend_configured: !!process.env.RESEND_API_KEY
        }
      }
    }, { status: 500 });
  }
}
