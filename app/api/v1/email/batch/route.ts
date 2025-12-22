import { NextRequest, NextResponse } from 'next/server';
import { sendBatchEmails, SendEmailParams } from '@/lib/email/resend';
import { withRateLimit } from '@/lib/rate-limit/middleware';
import {
  validateApiKey,
  logUsage,
  checkBalance,
  deductBalance,
  generateTransactionId,
  isValidEmail,
  PRICING,
  errorResponse
} from '@/lib/api-helpers';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Validate API key
    const keyData = await validateApiKey(request);
    if (!keyData) {
      return errorResponse('Invalid or missing API key', 401, 'UNAUTHORIZED');
    }

    // 2. Check if account is active
    if (!keyData.customers.is_active) {
      return errorResponse('Account suspended. Contact support.', 403, 'ACCOUNT_SUSPENDED');
    }

    // 3. Rate limiting
    const rateLimitResult = await withRateLimit(
      request,
      keyData.customer_id,
      keyData.customers.plan,
      'email'
    );

    if (rateLimitResult instanceof NextResponse) {
      return rateLimitResult;
    }

    // 4. Parse request
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400, 'INVALID_JSON');
    }

    const { emails } = body;

    // Validate emails array
    if (!Array.isArray(emails) || emails.length === 0) {
      return errorResponse('emails must be a non-empty array', 400, 'INVALID_INPUT');
    }

    if (emails.length > 100) {
      return errorResponse('Maximum 100 emails per batch request', 400, 'BATCH_LIMIT_EXCEEDED');
    }

    // 5. Validate each email in the batch
    const validatedEmails: SendEmailParams[] = [];
    let totalRecipients = 0;

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      
      if (!email.to) {
        return errorResponse(`Email at index ${i} missing required field: to`, 400, 'MISSING_FIELD');
      }
      
      if (!email.subject) {
        return errorResponse(`Email at index ${i} missing required field: subject`, 400, 'MISSING_FIELD');
      }
      
      if (!email.html && !email.text) {
        return errorResponse(`Email at index ${i} requires either html or text content`, 400, 'MISSING_CONTENT');
      }

      const recipients = Array.isArray(email.to) ? email.to : [email.to];
      
      for (const recipient of recipients) {
        if (!isValidEmail(recipient)) {
          return errorResponse(`Invalid email address at index ${i}: ${recipient}`, 400, 'INVALID_EMAIL');
        }
      }

      totalRecipients += recipients.length;
      validatedEmails.push({
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        from: email.from,
        replyTo: email.replyTo,
        tags: email.tags
      });
    }

    // 6. Calculate pricing (ENSURE PROFIT)
    const cost = PRICING.email.costPerEmail * totalRecipients;
    const price = Math.max(PRICING.email.pricePerEmail * totalRecipients, PRICING.email.minCharge * emails.length);
    const margin = price - cost;

    // 7. Check balance
    try {
      await checkBalance(keyData.customer_id, price);
    } catch (error) {
      if (error instanceof Error && error.message === 'Insufficient balance') {
        return errorResponse(
          'Insufficient balance for batch send',
          402,
          'INSUFFICIENT_BALANCE',
          { required: price, currency: 'USD' }
        );
      }
      throw error;
    }

    // 8. Create batch transaction record
    const batchId = generateTransactionId('batch');
    
    await getSupabase()
      .from('transactions')
      .insert({
        id: batchId,
        customer_id: keyData.customer_id,
        api_key_id: keyData.id,
        type: 'email_batch',
        status: 'pending',
        provider: 'resend',
        recipient_count: totalRecipients,
        request_data: {
          email_count: emails.length,
          total_recipients: totalRecipients
        },
        cost,
        price,
        margin,
        created_at: new Date().toISOString()
      });

    // 9. Log usage
    await logUsage(keyData.customer_id, keyData.id, '/api/v1/email/batch', 'POST');

    // 10. Send batch via Resend
    const result = await sendBatchEmails(validatedEmails);

    // 11. Update transaction
    const status = result.success ? 'sent' : 'failed';
    
    await getSupabase()
      .from('transactions')
      .update({
        status,
        response_data: result,
        sent_at: result.success ? new Date().toISOString() : null,
        completed_at: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime
      })
      .eq('id', batchId);

    // 12. Deduct balance if successful
    if (result.success) {
      await deductBalance(keyData.customer_id, price);
    }

    // 13. Return response
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'BATCH_SEND_FAILED',
          message: result.error || 'Failed to send batch emails',
          batch_id: batchId
        }
      }, { 
        status: 400,
        headers: rateLimitResult.headers
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        batch_id: batchId,
        status: 'sent',
        emails_sent: emails.length,
        total_recipients: totalRecipients,
        cost: price,
        currency: 'USD',
        results: result.data
      }
    }, { 
      status: 200,
      headers: rateLimitResult.headers
    });

  } catch (error: unknown) {
    console.error('Batch email API error:', error);
    
    return errorResponse(
      'Internal server error',
      500,
      'INTERNAL_ERROR'
    );
  }
}
