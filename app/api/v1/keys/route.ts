import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// GET - List API keys for the authenticated user
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

    // Get API keys
    const { data: keys, error: keysError } = await supabaseAdmin
      .from('api_keys')
      .select('id, name, key_preview, permissions, is_active, created_at, last_used_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    if (keysError) {
      console.error('Error fetching keys:', keysError);
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
    }

    return NextResponse.json(keys || []);
  } catch (error) {
    console.error('API keys GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new API key
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
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Key name is required' }, { status: 400 });
    }

    // Generate API key
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let apiKey = 'sc_live_';
    for (let i = 0; i < 48; i++) {
      apiKey += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const keyPreview = `${apiKey.substring(0, 12)}...${apiKey.substring(apiKey.length - 4)}`;

    // Create API key
    const { data: newKey, error: createError } = await supabaseAdmin
      .from('api_keys')
      .insert({
        customer_id: customer.id,
        key_hash: apiKey,
        key_preview: keyPreview,
        name: name.trim(),
        permissions: ['email', 'sms', 'airtime', 'data'],
        is_active: true,
      })
      .select('id, name, key_preview, permissions, is_active, created_at, last_used_at')
      .single();

    if (createError) {
      console.error('Error creating key:', createError);
      return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
    }

    return NextResponse.json({
      key: newKey,
      secret: apiKey, // Return the full key only on creation
    });
  } catch (error) {
    console.error('API keys POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Revoke an API key
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
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
    }

    // Revoke (soft delete) the key
    const { error: deleteError } = await supabaseAdmin
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', keyId)
      .eq('customer_id', customer.id);

    if (deleteError) {
      console.error('Error revoking key:', deleteError);
      return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API keys DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
