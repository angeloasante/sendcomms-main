import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

// Data bundle pricing: varies by package, average ~$0.50 per purchase + 15% markup
const DATA_MARKUP_PERCENTAGE = 0.15;

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

    // Get data stats
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all counts in parallel
    const [
      totalResult,
      pendingResult,
      processingResult,
      successfulResult,
      failedResult,
      refundedResult,
      last24hResult,
      last7dResult,
      last30dResult,
      totalAmountResult,
      todayAmountResult,
      weekAmountResult,
      monthAmountResult,
      dailyTrendResult,
      topOperatorsResult,
    ] = await Promise.all([
      adminClient.from('data_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id),
      adminClient.from('data_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).eq('status', 'pending'),
      adminClient.from('data_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).eq('status', 'processing'),
      adminClient.from('data_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).eq('status', 'successful'),
      adminClient.from('data_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).eq('status', 'failed'),
      adminClient.from('data_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).eq('status', 'refunded'),
      adminClient.from('data_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).gte('created_at', last24h),
      adminClient.from('data_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).gte('created_at', last7d),
      adminClient.from('data_logs').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).gte('created_at', last30d),
      // Total amount for successful purchases
      adminClient.from('data_logs').select('amount').eq('customer_id', customer.id).eq('status', 'successful'),
      adminClient.from('data_logs').select('amount').eq('customer_id', customer.id).eq('status', 'successful').gte('created_at', last24h),
      adminClient.from('data_logs').select('amount').eq('customer_id', customer.id).eq('status', 'successful').gte('created_at', last7d),
      adminClient.from('data_logs').select('amount').eq('customer_id', customer.id).eq('status', 'successful').gte('created_at', last30d),
      // Get daily data purchases for the last 30 days for the trend chart
      adminClient
        .from('data_logs')
        .select('created_at, status, amount')
        .eq('customer_id', customer.id)
        .gte('created_at', last30d)
        .order('created_at', { ascending: true }),
      // Top operators
      adminClient
        .from('data_logs')
        .select('operator_name')
        .eq('customer_id', customer.id)
        .eq('status', 'successful')
        .gte('created_at', last30d),
    ]);

    // Calculate totals
    const calculateSum = (data: { amount: number }[] | null) => {
      if (!data) return 0;
      return data.reduce((sum, row) => sum + (parseFloat(row.amount?.toString()) || 0), 0);
    };

    const totalAmount = calculateSum(totalAmountResult.data);
    const todayAmount = calculateSum(todayAmountResult.data);
    const weekAmount = calculateSum(weekAmountResult.data);
    const monthAmount = calculateSum(monthAmountResult.data);

    // Process daily trend data
    const dailyTrend: { date: string; purchases: number; successful: number; amount: number }[] = [];
    const purchasesByDate = new Map<string, { purchases: number; successful: number; amount: number }>();
    
    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      purchasesByDate.set(dateStr, { purchases: 0, successful: 0, amount: 0 });
    }
    
    // Count purchases by date
    if (dailyTrendResult.data) {
      for (const purchase of dailyTrendResult.data) {
        const dateStr = new Date(purchase.created_at).toISOString().split('T')[0];
        const existing = purchasesByDate.get(dateStr);
        if (existing) {
          existing.purchases++;
          if (purchase.status === 'successful') {
            existing.successful++;
            existing.amount += parseFloat(purchase.amount?.toString()) || 0;
          }
        }
      }
    }
    
    // Convert to array
    for (const [date, counts] of purchasesByDate) {
      dailyTrend.push({ date, ...counts });
    }

    // Count top operators
    const operatorCounts = new Map<string, number>();
    if (topOperatorsResult.data) {
      for (const row of topOperatorsResult.data) {
        if (row.operator_name) {
          operatorCounts.set(row.operator_name, (operatorCounts.get(row.operator_name) || 0) + 1);
        }
      }
    }
    const topOperators = Array.from(operatorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const totalPurchases = totalResult.count || 0;
    
    const stats = {
      total_purchases: totalPurchases,
      pending_count: pendingResult.count || 0,
      processing_count: processingResult.count || 0,
      successful_count: successfulResult.count || 0,
      failed_count: failedResult.count || 0,
      refunded_count: refundedResult.count || 0,
      last_24h_count: last24hResult.count || 0,
      last_7d_count: last7dResult.count || 0,
      last_30d_count: last30dResult.count || 0,
      // Pricing data
      total_amount: totalAmount,
      amount_today: todayAmount,
      amount_this_week: weekAmount,
      amount_this_month: monthAmount,
      // Trend data for chart
      daily_trend: dailyTrend,
      // Top operators
      top_operators: topOperators,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching data stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
