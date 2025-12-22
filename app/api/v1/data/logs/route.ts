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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const operator = searchParams.get('operator');

    // Build query
    let query = adminClient
      .from('data_logs')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (operator) {
      query = query.eq('operator_name', operator);
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      console.error('Error fetching data logs:', logsError);
      return NextResponse.json({ error: 'Failed to fetch data logs' }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = adminClient
      .from('data_logs')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customer.id);

    if (status) {
      countQuery = countQuery.eq('status', status);
    }
    if (operator) {
      countQuery = countQuery.eq('operator_name', operator);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      purchases: logs || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching data logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
