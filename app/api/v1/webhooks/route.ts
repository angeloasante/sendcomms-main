import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { validateApiKey, errorResponse } from '@/lib/api-helpers';
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

// Valid webhook event types
const VALID_EVENTS = [
  'email.sent',
  'email.delivered',
  'email.bounced',
  'email.complained',
  'email.opened',
  'email.clicked',
  'sms.sent',
  'sms.delivered',
  'sms.failed',
  'airtime.success',
  'airtime.failed',
  'data.success',
  'data.failed'
];

// POST - Register/update webhook endpoint
export async function POST(request: NextRequest) {
  try {
    // 1. Validate API key
    const keyData = await validateApiKey(request);
    if (!keyData) {
      return errorResponse('Invalid or missing API key', 401, 'UNAUTHORIZED');
    }

    // 2. Parse request body
    const body = await request.json();
    const { url, events, secret } = body;

    // 3. Validate URL
    if (!url || typeof url !== 'string') {
      return errorResponse('Webhook URL is required', 400, 'INVALID_URL');
    }

    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'https:') {
        return errorResponse('Webhook URL must use HTTPS', 400, 'INVALID_URL');
      }
    } catch {
      return errorResponse('Invalid webhook URL', 400, 'INVALID_URL');
    }

    // 4. Validate events
    if (!events || !Array.isArray(events) || events.length === 0) {
      return errorResponse('At least one event type is required', 400, 'INVALID_EVENTS');
    }

    const invalidEvents = events.filter(e => !VALID_EVENTS.includes(e));
    if (invalidEvents.length > 0) {
      return errorResponse(
        `Invalid event types: ${invalidEvents.join(', ')}. Valid events: ${VALID_EVENTS.join(', ')}`,
        400,
        'INVALID_EVENTS'
      );
    }

    // 5. Generate webhook secret if not provided
    const webhookSecret = secret || `whsec_${crypto.randomBytes(24).toString('hex')}`;

    // 6. Check if customer already has webhooks configured
    const { data: existingWebhook } = await getSupabase()
      .from('customer_webhooks')
      .select('*')
      .eq('customer_id', keyData.customer_id)
      .single();

    let webhookId: string;

    if (existingWebhook) {
      // Update existing webhook
      const { data: updated, error: updateError } = await getSupabase()
        .from('customer_webhooks')
        .update({
          url,
          events,
          secret: webhookSecret,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingWebhook.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating webhook:', updateError);
        return errorResponse('Failed to update webhook', 500, 'UPDATE_FAILED');
      }

      webhookId = updated.id;
    } else {
      // Create new webhook
      const { data: created, error: createError } = await getSupabase()
        .from('customer_webhooks')
        .insert({
          customer_id: keyData.customer_id,
          url,
          events,
          secret: webhookSecret,
          is_active: true
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating webhook:', createError);
        return errorResponse('Failed to create webhook', 500, 'CREATE_FAILED');
      }

      webhookId = created.id;
    }

    // 7. Also update the customer's webhook_url and webhook_secret for backwards compatibility
    await getSupabase()
      .from('customers')
      .update({
        webhook_url: url,
        webhook_secret: webhookSecret
      })
      .eq('id', keyData.customer_id);

    return NextResponse.json({
      success: true,
      data: {
        id: webhookId,
        url,
        events,
        secret: webhookSecret, // Only shown on creation
        active: true,
        created_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Webhook registration error:', error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

// GET - List webhook endpoints
export async function GET(request: NextRequest) {
  try {
    // 1. Validate API key
    const keyData = await validateApiKey(request);
    if (!keyData) {
      return errorResponse('Invalid or missing API key', 401, 'UNAUTHORIZED');
    }

    // 2. Get customer's webhooks
    const { data: webhooks, error } = await getSupabase()
      .from('customer_webhooks')
      .select('id, url, events, is_active, created_at, updated_at')
      .eq('customer_id', keyData.customer_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching webhooks:', error);
      return errorResponse('Failed to fetch webhooks', 500, 'FETCH_FAILED');
    }

    return NextResponse.json({
      success: true,
      data: webhooks || []
    });

  } catch (error) {
    console.error('Webhook list error:', error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

// DELETE - Remove webhook endpoint
export async function DELETE(request: NextRequest) {
  try {
    // 1. Validate API key
    const keyData = await validateApiKey(request);
    if (!keyData) {
      return errorResponse('Invalid or missing API key', 401, 'UNAUTHORIZED');
    }

    // 2. Get webhook ID from query params
    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('id');

    if (!webhookId) {
      return errorResponse('Webhook ID is required', 400, 'MISSING_ID');
    }

    // 3. Delete webhook (only if it belongs to this customer)
    const { error } = await getSupabase()
      .from('customer_webhooks')
      .delete()
      .eq('id', webhookId)
      .eq('customer_id', keyData.customer_id);

    if (error) {
      console.error('Error deleting webhook:', error);
      return errorResponse('Failed to delete webhook', 500, 'DELETE_FAILED');
    }

    // 4. Clear customer's webhook_url if this was their only webhook
    const { data: remainingWebhooks } = await getSupabase()
      .from('customer_webhooks')
      .select('id')
      .eq('customer_id', keyData.customer_id);

    if (!remainingWebhooks || remainingWebhooks.length === 0) {
      await getSupabase()
        .from('customers')
        .update({
          webhook_url: null,
          webhook_secret: null
        })
        .eq('id', keyData.customer_id);
    }

    return NextResponse.json({
      success: true,
      data: {
        deleted: true,
        id: webhookId
      }
    });

  } catch (error) {
    console.error('Webhook delete error:', error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}
