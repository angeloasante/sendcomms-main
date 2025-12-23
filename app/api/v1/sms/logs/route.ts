import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user using server-side cookies
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client for queries
    const adminClient = createAdminClient();

    // Get customer ID
    const { data: customer, error: customerError } = await adminClient
      .from('customers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const country = searchParams.get('country');
    const search = searchParams.get('search');

    // Build query
    let query = adminClient
      .from('sms_logs')
      .select('*', { count: 'exact' })
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (country) {
      query = query.eq('country_name', country);
    }

    if (search) {
      query = query.or(`phone_number.ilike.%${search}%,message_content.ilike.%${search}%`);
    }

    const { data: messages, error: messagesError, count } = await query;

    if (messagesError) {
      console.error('Error fetching SMS logs:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch SMS logs' }, { status: 500 });
    }

    return NextResponse.json({
      messages: messages || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching SMS logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
