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

    // Get SMS stats
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all counts in parallel
    const [
      totalResult,
      sentResult,
      deliveredResult,
      failedResult,
      last24hResult,
      last7dResult,
      last30dResult,
      totalCostResult,
      todayCostResult,
      weekCostResult,
      monthCostResult,
      dailyTrendResult,
      topCountriesResult,
      totalSegmentsResult,
    ] = await Promise.all([
      adminClient.from('sms_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id),
      adminClient.from('sms_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).eq('status', 'sent'),
      adminClient.from('sms_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).eq('status', 'delivered'),
      adminClient.from('sms_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).eq('status', 'failed'),
      adminClient.from('sms_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).gte('created_at', last24h),
      adminClient.from('sms_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).gte('created_at', last7d),
      adminClient.from('sms_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).gte('created_at', last30d),
      // Total cost for sent messages
      adminClient.from('sms_logs').select('price').eq('customer_id', customer.id).in('status', ['sent', 'delivered']),
      adminClient.from('sms_logs').select('price').eq('customer_id', customer.id).in('status', ['sent', 'delivered']).gte('created_at', last24h),
      adminClient.from('sms_logs').select('price').eq('customer_id', customer.id).in('status', ['sent', 'delivered']).gte('created_at', last7d),
      adminClient.from('sms_logs').select('price').eq('customer_id', customer.id).in('status', ['sent', 'delivered']).gte('created_at', last30d),
      // Get daily SMS for the last 30 days for the trend chart
      adminClient
        .from('sms_logs')
        .select('created_at, status, price, segments')
        .eq('customer_id', customer.id)
        .gte('created_at', last30d)
        .order('created_at', { ascending: true }),
      // Top countries
      adminClient
        .from('sms_logs')
        .select('country_name')
        .eq('customer_id', customer.id)
        .in('status', ['sent', 'delivered'])
        .gte('created_at', last30d),
      // Total segments
      adminClient
        .from('sms_logs')
        .select('segments')
        .eq('customer_id', customer.id)
        .in('status', ['sent', 'delivered']),
    ]);

    // Calculate totals
    const calculateSum = (data: { price: number }[] | null) => {
      if (!data) return 0;
      return data.reduce((sum, row) => sum + (parseFloat(row.price?.toString()) || 0), 0);
    };

    const calculateSegments = (data: { segments: number }[] | null) => {
      if (!data) return 0;
      return data.reduce((sum, row) => sum + (parseInt(row.segments?.toString()) || 1), 0);
    };

    const totalCost = calculateSum(totalCostResult.data);
    const todayCost = calculateSum(todayCostResult.data);
    const weekCost = calculateSum(weekCostResult.data);
    const monthCost = calculateSum(monthCostResult.data);
    const totalSegments = calculateSegments(totalSegmentsResult.data);

    // Process daily trend data
    const dailyTrend: { date: string; sent: number; delivered: number; cost: number }[] = [];
    const smsByDate = new Map<string, { sent: number; delivered: number; cost: number }>();
    
    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      smsByDate.set(dateStr, { sent: 0, delivered: 0, cost: 0 });
    }
    
    // Count SMS by date
    if (dailyTrendResult.data) {
      for (const sms of dailyTrendResult.data) {
        const dateStr = new Date(sms.created_at).toISOString().split('T')[0];
        const existing = smsByDate.get(dateStr);
        if (existing) {
          if (sms.status === 'sent' || sms.status === 'delivered') {
            existing.sent++;
            existing.cost += parseFloat(sms.price?.toString()) || 0;
          }
          if (sms.status === 'delivered') {
            existing.delivered++;
          }
        }
      }
    }
    
    // Convert to array
    for (const [date, counts] of smsByDate) {
      dailyTrend.push({ date, ...counts });
    }

    // Count top countries
    const countryCounts = new Map<string, number>();
    if (topCountriesResult.data) {
      for (const row of topCountriesResult.data) {
        if (row.country_name) {
          countryCounts.set(row.country_name, (countryCounts.get(row.country_name) || 0) + 1);
        }
      }
    }
    const topCountries = Array.from(countryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const totalSMS = totalResult.count || 0;
    const sentCount = sentResult.count || 0;
    const deliveredCount = deliveredResult.count || 0;
    
    // Calculate average price per SMS
    const avgPricePerSMS = (sentCount + deliveredCount) > 0 
      ? totalCost / (sentCount + deliveredCount) 
      : 0;

    const stats = {
      total_sms: totalSMS,
      sent_count: sentCount,
      delivered_count: deliveredCount,
      failed_count: failedResult.count || 0,
      total_segments: totalSegments,
      last_24h_count: last24hResult.count || 0,
      last_7d_count: last7dResult.count || 0,
      last_30d_count: last30dResult.count || 0,
      // Pricing data
      avg_price_per_sms: avgPricePerSMS,
      total_cost: totalCost,
      cost_today: todayCost,
      cost_this_week: weekCost,
      cost_this_month: monthCost,
      // Trend data for chart
      daily_trend: dailyTrend,
      // Top countries
      top_countries: topCountries,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching SMS stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
