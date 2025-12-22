import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

// Email pricing: $0.00046 per email (base) + 15% markup = $0.000529
const EMAIL_PRICE_PER_EMAIL = 0.000529;

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

    // Get email stats
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all counts in parallel
    const [
      totalResult,
      sentResult,
      deliveredResult,
      openedResult,
      clickedResult,
      bouncedResult,
      failedResult,
      last24hResult,
      last7dResult,
      last30dResult,
      dailyTrendResult,
    ] = await Promise.all([
      adminClient.from('email_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id),
      adminClient.from('email_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).eq('status', 'sent'),
      adminClient.from('email_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).eq('status', 'delivered'),
      adminClient.from('email_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).eq('status', 'opened'),
      adminClient.from('email_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).eq('status', 'clicked'),
      adminClient.from('email_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).eq('status', 'bounced'),
      adminClient.from('email_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).eq('status', 'failed'),
      adminClient.from('email_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).gte('created_at', last24h),
      adminClient.from('email_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).gte('created_at', last7d),
      adminClient.from('email_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).gte('created_at', last30d),
      // Get daily email counts for the last 30 days for the trend chart
      adminClient
        .from('email_logs')
        .select('created_at, status')
        .eq('customer_id', customer.id)
        .gte('created_at', last30d)
        .order('created_at', { ascending: true }),
    ]);

    // Process daily trend data
    const dailyTrend: { date: string; sent: number; delivered: number; opened: number }[] = [];
    const emailsByDate = new Map<string, { sent: number; delivered: number; opened: number }>();
    
    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      emailsByDate.set(dateStr, { sent: 0, delivered: 0, opened: 0 });
    }
    
    // Count emails by date
    if (dailyTrendResult.data) {
      for (const email of dailyTrendResult.data) {
        const dateStr = new Date(email.created_at).toISOString().split('T')[0];
        const existing = emailsByDate.get(dateStr);
        if (existing) {
          existing.sent++;
          if (email.status === 'delivered' || email.status === 'opened' || email.status === 'clicked') {
            existing.delivered++;
          }
          if (email.status === 'opened' || email.status === 'clicked') {
            existing.opened++;
          }
        }
      }
    }
    
    // Convert to array
    for (const [date, counts] of emailsByDate) {
      dailyTrend.push({ date, ...counts });
    }

    const totalEmails = totalResult.count || 0;
    
    const stats = {
      total_emails: totalEmails,
      sent_count: sentResult.count || 0,
      delivered_count: deliveredResult.count || 0,
      opened_count: openedResult.count || 0,
      clicked_count: clickedResult.count || 0,
      bounced_count: bouncedResult.count || 0,
      failed_count: failedResult.count || 0,
      last_24h_count: last24hResult.count || 0,
      last_7d_count: last7dResult.count || 0,
      last_30d_count: last30dResult.count || 0,
      // Pricing data
      price_per_email: EMAIL_PRICE_PER_EMAIL,
      total_cost: totalEmails * EMAIL_PRICE_PER_EMAIL,
      cost_today: (last24hResult.count || 0) * EMAIL_PRICE_PER_EMAIL,
      cost_this_week: (last7dResult.count || 0) * EMAIL_PRICE_PER_EMAIL,
      cost_this_month: (last30dResult.count || 0) * EMAIL_PRICE_PER_EMAIL,
      // Trend data for chart
      daily_trend: dailyTrend,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching email stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
