import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// GET - List webhooks for the authenticated user
export async function GET() {
  try {
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get webhooks
    const { data: webhooks, error: webhooksError } = await supabaseAdmin
      .from('customer_webhooks')
      .select('id, url, events, is_active, created_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    if (webhooksError) {
      console.error('Error fetching webhooks:', webhooksError);
      return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 });
    }

    return NextResponse.json(webhooks || []);
  } catch (error) {
    console.error('Webhooks GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new webhook
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const body = await request.json();
    const { url, events } = body;

    if (!url?.trim()) {
      return NextResponse.json({ error: 'Webhook URL is required' }, { status: 400 });
    }

    if (!events || events.length === 0) {
      return NextResponse.json({ error: 'At least one event is required' }, { status: 400 });
    }

    // Validate URL
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'https:') {
        return NextResponse.json({ error: 'Webhook URL must use HTTPS' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid webhook URL' }, { status: 400 });
    }

    // Generate webhook secret
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let secret = 'whsec_';
    for (let i = 0; i < 48; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Create webhook
    const { data: newWebhook, error: createError } = await supabaseAdmin
      .from('customer_webhooks')
      .insert({
        customer_id: customer.id,
        url: url.trim(),
        events,
        secret,
        is_active: true,
      })
      .select('id, url, events, is_active, created_at')
      .single();

    if (createError) {
      console.error('Error creating webhook:', createError);
      return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 });
    }

    return NextResponse.json({
      webhook: newWebhook,
      secret, // Return the secret only on creation
    });
  } catch (error) {
    console.error('Webhooks POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a webhook
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('id');

    if (!webhookId) {
      return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 });
    }

    // Delete the webhook
    const { error: deleteError } = await supabaseAdmin
      .from('customer_webhooks')
      .delete()
      .eq('id', webhookId)
      .eq('customer_id', customer.id);

    if (deleteError) {
      console.error('Error deleting webhook:', deleteError);
      return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhooks DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
