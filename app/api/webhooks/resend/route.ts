import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sendWebhook } from '@/lib/api-helpers';
import { getDomain } from '@/lib/email/domains';
import crypto from 'crypto';

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

// Resend webhook signing secret
const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET || '';

// Resend webhook event types
type ResendEventType = 
  | 'email.sent'
  | 'email.delivered'
  | 'email.delivery_delayed'
  | 'email.complained'
  | 'email.bounced'
  | 'email.opened'
  | 'email.clicked'
  | 'domain.created'
  | 'domain.updated'
  | 'domain.deleted';

interface ResendEmailWebhookData {
  email_id: string;
  from: string;
  to: string[];
  subject: string;
  created_at: string;
  // For bounce events
  bounce?: {
    message: string;
  };
  // For click events
  click?: {
    link: string;
    timestamp: string;
  };
  // For open events
  open?: {
    timestamp: string;
    user_agent: string;
  };
}

interface ResendDomainWebhookData {
  id: string;
  name: string;
  status: 'not_started' | 'pending' | 'verified' | 'failed' | 'temporary_failure' | 'partially_failed';
  created_at: string;
  region: string;
}

interface ResendWebhookPayload {
  type: ResendEventType;
  created_at: string;
  data: ResendEmailWebhookData | ResendDomainWebhookData;
}

// Helper to check if payload is a domain event
function isDomainEvent(type: ResendEventType): boolean {
  return type.startsWith('domain.');
}

// Handle domain webhook events
async function handleDomainWebhook(payload: ResendWebhookPayload): Promise<NextResponse> {
  const domainData = payload.data as ResendDomainWebhookData;
  
  console.log(`Domain webhook received: ${payload.type} for domain ${domainData.name} (${domainData.id})`);

  // Find the domain by resend_domain_id
  const { data: domain, error: domainError } = await getSupabase()
    .from('customer_domains')
    .select('*, customers(id, email, name)')
    .eq('resend_domain_id', domainData.id)
    .single();

  if (domainError || !domain) {
    console.log('Domain not found for resend_domain_id:', domainData.id);
    
    // Log unknown webhook but don't fail
    await getSupabase()
      .from('webhook_logs')
      .insert({
        provider: 'resend',
        event_type: payload.type,
        payload,
        processed: false,
        error: 'Domain not found',
        received_at: new Date().toISOString()
      });
    
    return NextResponse.json({ received: true });
  }

  const previousStatus = domain.status;
  let newStatus = domainData.status;

  // Map 'partially_failed' to 'verified' if sending works (common for domains without receiving)
  if (newStatus === 'partially_failed') {
    // Check if it's verified for sending - treat as verified
    newStatus = 'verified';
  }

  // Handle based on event type
  switch (payload.type) {
    case 'domain.created':
      // Domain was created via Resend dashboard/API directly
      // Our DB should already have it if created via our API
      console.log(`Domain created: ${domainData.name}`);
      break;
      
    case 'domain.updated':
      // Fetch full domain details from Resend to get updated DNS records
      const domainDetails = await getDomain(domainData.id);
      
      // Status changed - update our database
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString()
      };

      // Update DNS records if we got them from the API
      if (domainDetails.success && domainDetails.data?.records) {
        updateData.dns_records = domainDetails.data.records;
        console.log(`Updated DNS records for ${domainData.name}:`, 
          domainDetails.data.records.map(r => `${r.record}: ${r.status}`).join(', ')
        );
      }

      // If newly verified, set verified_at and enable sending
      if (newStatus === 'verified' && previousStatus !== 'verified') {
        updateData.verified_at = new Date().toISOString();
        updateData.sending_enabled = true;
      }

      // If failed, disable sending
      if (newStatus === 'failed') {
        updateData.sending_enabled = false;
      }

      await getSupabase()
        .from('customer_domains')
        .update(updateData)
        .eq('id', domain.id);

      // Log the status change
      await getSupabase()
        .from('domain_verification_logs')
        .insert({
          domain_id: domain.id,
          customer_id: domain.customer_id,
          previous_status: previousStatus,
          new_status: newStatus,
          triggered_by: 'webhook',
          spf_status: domainDetails.data?.records?.find(r => r.record === 'SPF')?.status || null,
          dkim_status: domainDetails.data?.records?.find(r => r.record === 'DKIM')?.status || null,
          metadata: {
            webhook_type: payload.type,
            resend_data: domainData,
            dns_records: domainDetails.data?.records || null
          },
          created_at: new Date().toISOString()
        });

      console.log(`Domain ${domainData.name} status updated: ${previousStatus} -> ${newStatus}`);
      break;
      
    case 'domain.deleted':
      // Domain was deleted from Resend - soft delete in our DB
      await getSupabase()
        .from('customer_domains')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', domain.id);

      // Log the deletion
      await getSupabase()
        .from('domain_verification_logs')
        .insert({
          domain_id: domain.id,
          customer_id: domain.customer_id,
          previous_status: previousStatus,
          new_status: 'deleted',
          triggered_by: 'webhook',
          metadata: {
            webhook_type: payload.type,
            resend_data: domainData
          },
          created_at: new Date().toISOString()
        });

      console.log(`Domain ${domainData.name} marked as deleted`);
      break;
  }

  // Log webhook receipt
  await getSupabase()
    .from('webhook_logs')
    .insert({
      customer_id: domain.customer_id,
      provider: 'resend',
      event_type: payload.type,
      payload,
      processed: true,
      received_at: new Date().toISOString()
    });

  return NextResponse.json({
    success: true,
    message: 'Domain webhook processed',
    domain: domainData.name,
    status: newStatus
  });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Get raw body for signature verification
    const rawBody = await request.text();
    
    // 2. Verify webhook signature (if secret is configured)
    if (RESEND_WEBHOOK_SECRET) {
      const signature = request.headers.get('svix-signature') || '';
      const timestamp = request.headers.get('svix-timestamp') || '';
      const webhookId = request.headers.get('svix-id') || '';
      
      // Check timestamp to prevent replay attacks (5 minutes tolerance)
      const timestampSeconds = parseInt(timestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      if (isNaN(timestampSeconds) || Math.abs(now - timestampSeconds) > 300) {
        console.error('Webhook timestamp too old or invalid');
        return NextResponse.json(
          { error: 'Invalid timestamp' },
          { status: 401 }
        );
      }
      
      // Resend uses Svix for webhooks - construct signed payload
      const signedPayload = `${webhookId}.${timestamp}.${rawBody}`;
      
      // The webhook secret from Svix starts with "whsec_" - we need to base64 decode the part after it
      const secretBytes = Buffer.from(RESEND_WEBHOOK_SECRET.replace('whsec_', ''), 'base64');
      
      // Extract signatures from header (format: "v1,base64sig v1,base64sig2")
      const signatures = signature.split(' ');
      let isValid = false;
      
      for (const sig of signatures) {
        const [version, sigValue] = sig.split(',');
        if (version === 'v1' && sigValue) {
          // Compute expected signature using HMAC-SHA256 with base64 output
          const expectedSig = crypto
            .createHmac('sha256', secretBytes)
            .update(signedPayload)
            .digest('base64');
          
          // Compare signatures
          try {
            if (crypto.timingSafeEqual(Buffer.from(sigValue), Buffer.from(expectedSig))) {
              isValid = true;
              break;
            }
          } catch {
            // Buffer lengths don't match, continue to next signature
          }
        }
      }
      
      if (!isValid) {
        console.error('Invalid webhook signature');
        console.error('Headers:', { signature, timestamp, webhookId });
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // 3. Parse the webhook payload
    const payload: ResendWebhookPayload = JSON.parse(rawBody);
    
    console.log('Resend webhook received:', payload.type);

    // 4. Route to appropriate handler based on event type
    if (isDomainEvent(payload.type)) {
      return await handleDomainWebhook(payload);
    }

    // 5. Handle email events - Find the transaction by provider_id (email_id from Resend)
    const emailData = payload.data as ResendEmailWebhookData;
    
    const { data: transaction, error: txError } = await getSupabase()
      .from('transactions')
      .select(`
        *,
        customers (
          id,
          webhook_url,
          webhook_secret
        )
      `)
      .eq('provider_id', emailData.email_id)
      .single();

    if (txError || !transaction) {
      // Log unknown webhook but don't fail - might be from test emails
      console.log('Transaction not found for email_id:', emailData.email_id);
      
      await getSupabase()
        .from('webhook_logs')
        .insert({
          provider: 'resend',
          event_type: payload.type,
          payload,
          processed: false,
          error: 'Transaction not found',
          received_at: new Date().toISOString()
        });
      
      return NextResponse.json({ received: true });
    }

    // 6. Map Resend event to our status
    let newStatus: string | null = null;
    let eventType: string = payload.type;
    
    switch (payload.type) {
      case 'email.sent':
        newStatus = 'sent';
        break;
      case 'email.delivered':
        newStatus = 'delivered';
        break;
      case 'email.bounced':
        newStatus = 'bounced';
        break;
      case 'email.complained':
        newStatus = 'complained';
        break;
      case 'email.delivery_delayed':
        newStatus = 'delayed';
        break;
      case 'email.opened':
        // Don't change status, just log the event
        eventType = 'email.opened';
        break;
      case 'email.clicked':
        // Don't change status, just log the event
        eventType = 'email.clicked';
        break;
    }

    // 7. Update transaction status
    const updateData: Record<string, unknown> = {
      webhook_data: {
        ...((transaction.webhook_data as Record<string, unknown>) || {}),
        [payload.type]: {
          received_at: new Date().toISOString(),
          data: emailData
        }
      }
    };

    if (newStatus && newStatus !== transaction.status) {
      updateData.status = newStatus;
      
      if (newStatus === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
        updateData.completed_at = new Date().toISOString();
      } else if (newStatus === 'bounced' || newStatus === 'complained') {
        updateData.failed_at = new Date().toISOString();
        updateData.completed_at = new Date().toISOString();
        updateData.failure_reason = emailData.bounce?.message || payload.type;
      }
    }

    await getSupabase()
      .from('transactions')
      .update(updateData)
      .eq('id', transaction.id);

    // 8. Forward webhook to customer if they have a webhook URL configured
    const customer = transaction.customers as { id: string; webhook_url: string | null; webhook_secret: string | null };
    
    if (customer?.webhook_url) {
      const customerPayload = {
        event: eventType,
        data: {
          id: transaction.id,
          email_id: emailData.email_id,
          type: 'email',
          status: newStatus || transaction.status,
          to: emailData.to,
          subject: emailData.subject,
          from: emailData.from,
          // Include event-specific data
          ...(payload.type === 'email.bounced' && {
            bounce_message: emailData.bounce?.message
          }),
          ...(payload.type === 'email.opened' && {
            opened_at: emailData.open?.timestamp,
            user_agent: emailData.open?.user_agent
          }),
          ...(payload.type === 'email.clicked' && {
            clicked_link: emailData.click?.link,
            clicked_at: emailData.click?.timestamp
          })
        }
      };

      // Send webhook to customer (async)
      sendWebhook(
        transaction.id,
        customer.id,
        customer.webhook_url,
        customer.webhook_secret,
        customerPayload
      ).catch(err => console.error('Customer webhook failed:', err));
    }

    // 9. Log webhook receipt
    await getSupabase()
      .from('webhook_logs')
      .insert({
        transaction_id: transaction.id,
        customer_id: transaction.customer_id,
        provider: 'resend',
        event_type: payload.type,
        payload,
        processed: true,
        received_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      message: 'Webhook processed'
    });

  } catch (error) {
    console.error('Resend webhook error:', error);
    
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// Resend sends GET request to verify webhook endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
