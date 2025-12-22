import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sendWebhook, verifyWebhookSignature } from '@/lib/api-helpers';

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
  | 'email.clicked';

interface ResendWebhookPayload {
  type: ResendEventType;
  created_at: string;
  data: {
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
  };
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
      
      // Resend uses Svix for webhooks - construct signed payload
      const signedPayload = `${webhookId}.${timestamp}.${rawBody}`;
      
      // Extract signature from header (format: v1,signature)
      const signatures = signature.split(' ');
      let isValid = false;
      
      for (const sig of signatures) {
        const [version, sigValue] = sig.split(',');
        if (version === 'v1' && sigValue) {
          if (verifyWebhookSignature(signedPayload, sigValue, RESEND_WEBHOOK_SECRET)) {
            isValid = true;
            break;
          }
        }
      }
      
      if (!isValid) {
        console.error('Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // 3. Parse the webhook payload
    const payload: ResendWebhookPayload = JSON.parse(rawBody);
    
    console.log('Resend webhook received:', payload.type, payload.data.email_id);

    // 4. Find the transaction by provider_id (email_id from Resend)
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
      .eq('provider_id', payload.data.email_id)
      .single();

    if (txError || !transaction) {
      // Log unknown webhook but don't fail - might be from test emails
      console.log('Transaction not found for email_id:', payload.data.email_id);
      
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

    // 5. Map Resend event to our status
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

    // 6. Update transaction status
    const updateData: Record<string, unknown> = {
      webhook_data: {
        ...((transaction.webhook_data as Record<string, unknown>) || {}),
        [payload.type]: {
          received_at: new Date().toISOString(),
          data: payload.data
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
        updateData.failure_reason = payload.data.bounce?.message || payload.type;
      }
    }

    await getSupabase()
      .from('transactions')
      .update(updateData)
      .eq('id', transaction.id);

    // 7. Forward webhook to customer if they have a webhook URL configured
    const customer = transaction.customers as { id: string; webhook_url: string | null; webhook_secret: string | null };
    
    if (customer?.webhook_url) {
      const customerPayload = {
        event: eventType,
        data: {
          id: transaction.id,
          email_id: payload.data.email_id,
          type: 'email',
          status: newStatus || transaction.status,
          to: payload.data.to,
          subject: payload.data.subject,
          from: payload.data.from,
          // Include event-specific data
          ...(payload.type === 'email.bounced' && {
            bounce_message: payload.data.bounce?.message
          }),
          ...(payload.type === 'email.opened' && {
            opened_at: payload.data.open?.timestamp,
            user_agent: payload.data.open?.user_agent
          }),
          ...(payload.type === 'email.clicked' && {
            clicked_link: payload.data.click?.link,
            clicked_at: payload.data.click?.timestamp
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

    // 8. Log webhook receipt
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
