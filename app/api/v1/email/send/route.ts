import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend';
import { withRateLimit } from '@/lib/rate-limit/middleware';
import {
  validateApiKey,
  logUsage,
  checkBalance,
  deductBalance,
  sendWebhook,
  generateTransactionId,
  isValidEmail,
  PRICING,
  errorResponse
} from '@/lib/api-helpers';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { detectRegion } from '@/lib/region-detection';

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

    // 2. Check if customer account is active
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

    // 4. Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400, 'INVALID_JSON');
    }

    const {
      to,
      subject,
      html,
      text,
      from,
      replyTo,
      cc,
      bcc,
      attachments,
      tags,
      headers,
      idempotency_key
    } = body;

    // Required fields validation
    if (!to) {
      return errorResponse('Missing required field: to', 400, 'MISSING_FIELD');
    }
    
    if (!subject) {
      return errorResponse('Missing required field: subject', 400, 'MISSING_FIELD');
    }

    if (!html && !text) {
      return errorResponse('Either html or text content is required', 400, 'MISSING_CONTENT');
    }

    // Validate email addresses
    const recipients = Array.isArray(to) ? to : [to];
    
    if (recipients.length === 0) {
      return errorResponse('At least one recipient is required', 400, 'NO_RECIPIENTS');
    }

    if (recipients.length > 50) {
      return errorResponse('Maximum 50 recipients per request. Use batch endpoint for more.', 400, 'TOO_MANY_RECIPIENTS');
    }
    
    for (const email of recipients) {
      if (!isValidEmail(email)) {
        return errorResponse(`Invalid email address: ${email}`, 400, 'INVALID_EMAIL');
      }
    }

    // Validate CC/BCC if provided
    if (cc) {
      const ccList = Array.isArray(cc) ? cc : [cc];
      for (const email of ccList) {
        if (!isValidEmail(email)) {
          return errorResponse(`Invalid CC email address: ${email}`, 400, 'INVALID_EMAIL');
        }
      }
    }

    if (bcc) {
      const bccList = Array.isArray(bcc) ? bcc : [bcc];
      for (const email of bccList) {
        if (!isValidEmail(email)) {
          return errorResponse(`Invalid BCC email address: ${email}`, 400, 'INVALID_EMAIL');
        }
      }
    }

    // 5. Check for duplicate request (idempotency)
    if (idempotency_key) {
      const { data: existing } = await getSupabase()
        .from('transactions')
        .select('*')
        .eq('customer_id', keyData.customer_id)
        .eq('idempotency_key', idempotency_key)
        .gte('created_at', new Date(Date.now() - 86400000).toISOString()) // Last 24 hours
        .single();

      if (existing) {
        return NextResponse.json({
          success: true,
          data: {
            id: existing.id,
            status: existing.status,
            email_id: existing.provider_id,
            recipients: recipients.length,
            message: 'Duplicate request - returning cached response'
          }
        }, { 
          status: 200,
          headers: rateLimitResult.headers 
        });
      }
    }

    // 6. Calculate pricing (ENSURE PROFIT)
    const recipientCount = recipients.length;
    const cost = PRICING.email.costPerEmail * recipientCount;
    const price = Math.max(PRICING.email.pricePerEmail * recipientCount, PRICING.email.minCharge);
    const margin = price - cost;

    // 7. Check balance (for prepaid customers)
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
    const transactionId = generateTransactionId('email');
    
    // Detect region from first recipient
    const regionInfo = detectRegion(recipients[0]);
    
    const { data: transaction, error: txError } = await getSupabase()
      .from('transactions')
      .insert({
        id: transactionId,
        customer_id: keyData.customer_id,
        api_key_id: keyData.id,
        type: 'email',
        status: 'pending',
        provider: 'resend',
        destination: recipients[0],
        recipient_count: recipientCount,
        country: regionInfo?.code || null,
        region: regionInfo?.region || null,
        request_data: {
          to: recipients,
          subject,
          from: from || 'SendComms <noreply@sendcomms.com>',
          replyTo,
          cc,
          bcc,
          has_attachments: !!attachments?.length,
          tags
        },
        cost,
        price,
        margin,
        idempotency_key: idempotency_key || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (txError) {
      console.error('Failed to create transaction:', txError);
      // Continue anyway - we'll log manually
    }

    // 9. Log API usage
    await logUsage(keyData.customer_id, keyData.id, '/api/v1/email/send', 'POST');

    // 10. Send email via Resend
    const result = await sendEmail({
      to: recipients,
      subject,
      html,
      text,
      from: from || 'SendComms <noreply@sendcomms.com>',
      replyTo,
      cc,
      bcc,
      attachments,
      tags: [
        ...(tags || []),
        { name: 'customer_id', value: keyData.customer_id },
        { name: 'transaction_id', value: transactionId }
      ],
      headers
    });

    // 11. Update transaction status
    const status = result.success ? 'sent' : 'failed';
    const now = new Date().toISOString();
    
    await getSupabase()
      .from('transactions')
      .update({
        status,
        provider_id: result.id,
        response_data: { 
          success: result.success, 
          error: result.error,
          email_id: result.id
        },
        sent_at: result.success ? now : null,
        completed_at: status === 'failed' ? now : null,
        processing_time_ms: Date.now() - startTime
      })
      .eq('id', transactionId);

    // 11b. Log to email_logs table for dashboard tracking
    const fromEmail = from || 'SendComms <noreply@sendcomms.com>';
    const fromParts = fromEmail.match(/^(.+?)\s*<(.+?)>$/) || [null, null, fromEmail];
    
    // Log each recipient as a separate email entry
    for (const recipient of recipients) {
      try {
        await getSupabase()
          .from('email_logs')
          .insert({
            customer_id: keyData.customer_id,
            message_id: result.id,
            from_email: fromParts[2] || fromEmail,
            from_name: fromParts[1] || null,
            to_email: recipient,
            reply_to: replyTo,
            subject,
            html_content: html,
            text_content: text,
            attachments: attachments ? attachments.map((a: { filename?: string }) => ({ filename: a.filename })) : [],
            status: result.success ? 'sent' : 'failed',
            tags: tags || [],
            metadata: {
              transaction_id: transactionId,
              cc,
              bcc,
              headers
            },
            api_key_id: keyData.id,
            ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
            user_agent: request.headers.get('user-agent'),
            error_code: result.success ? null : 'SEND_FAILED',
            error_message: result.error || null,
            sent_at: result.success ? now : null
          });
      } catch (err) {
        console.error('Failed to log email:', err);
      }
    }

    // 12. Deduct balance if successful
    if (result.success) {
      await deductBalance(keyData.customer_id, price);
    }

    // 13. Send webhook notification (async - don't wait)
    if (keyData.customers.webhook_url) {
      sendWebhook(
        transactionId,
        keyData.customer_id,
        keyData.customers.webhook_url,
        keyData.customers.webhook_secret,
        {
          event: result.success ? 'email.sent' : 'email.failed',
          data: {
            id: transactionId,
            type: 'email',
            status,
            to: recipients,
            subject,
            from: from || 'SendComms <noreply@sendcomms.com>',
            recipients: recipientCount,
            email_id: result.id,
            cost: price,
            error: result.error
          }
        }
      ).catch(err => console.error('Webhook delivery failed:', err));
    }

    // 14. Return response
    if (!result.success) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: result.error || 'Failed to send email',
          transaction_id: transactionId
        }
      }, { 
        status: 400,
        headers: rateLimitResult.headers
      });
      return response;
    }

    const response = NextResponse.json({
      success: true,
      data: {
        id: transactionId,
        email_id: result.id,
        status: 'sent',
        recipients: recipientCount,
        cost: price,
        currency: 'USD'
      }
    }, { 
      status: 200,
      headers: rateLimitResult.headers
    });

    return response;

  } catch (error: unknown) {
    console.error('Email API Error:', error);
    
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
    
    return errorResponse(
      'Internal server error. Please try again.',
      500,
      'INTERNAL_ERROR'
    );
  }
}
