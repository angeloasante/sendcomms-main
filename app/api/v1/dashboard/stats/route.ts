import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { validateApiKey, errorResponse } from '@/lib/api-helpers';
import { detectRegion, normalizeRegionForDisplay, AFRICAN_REGIONS } from '@/lib/region-detection';

export async function GET(request: NextRequest) {
  try {
    let customerId: string | null = null;

    // First try API key auth (for external API calls)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const keyData = await validateApiKey(request);
      if (keyData) {
        customerId = keyData.customer_id;
      }
    }

    // If no API key, try cookie-based auth (for dashboard)
    if (!customerId) {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
      }

      // Get customer ID from auth user
      const adminClient = createAdminClient();
      const { data: customer, error: customerError } = await adminClient
        .from('customers')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (customerError || !customer) {
        return errorResponse('Customer not found', 404, 'NOT_FOUND');
      }
      
      customerId = customer.id;
    }

    // Use admin client for all queries
    const supabaseClient = createAdminClient();

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get 30 days ago for monthly stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch all stats in parallel
    const [
      todayTransactions,
      monthlyTransactions,
      recentActivity,
      customerData,
      webhookCount,
      apiKeyCount
    ] = await Promise.all([
      // Today's transactions by type
      supabaseClient
        .from('transactions')
        .select('type, status, created_at')
        .eq('customer_id', customerId)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString()),

      // Monthly transactions for trends
      supabaseClient
        .from('transactions')
        .select('type, status, created_at, destination, region, country')
        .eq('customer_id', customerId)
        .gte('created_at', thirtyDaysAgo.toISOString()),

      // Recent activity (last 10 transactions)
      supabaseClient
        .from('transactions')
        .select('id, type, status, destination, recipient_count, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(10),

      // Customer data (balance, plan)
      supabaseClient
        .from('customers')
        .select('balance, plan, company, name')
        .eq('id', customerId)
        .single(),

      // Webhook count
      supabaseClient
        .from('customer_webhooks')
        .select('id', { count: 'exact' })
        .eq('customer_id', customerId)
        .eq('is_active', true),

      // API key count
      supabaseClient
        .from('api_keys')
        .select('id', { count: 'exact' })
        .eq('customer_id', customerId)
        .eq('is_active', true)
    ]);

    // Calculate today's stats by service type
    const todayStats = {
      email: 0,
      sms: 0,
      airtime: 0,
      data: 0,
      total: 0
    };

    if (todayTransactions.data) {
      for (const tx of todayTransactions.data) {
        todayStats.total++;
        if (tx.type === 'email' || tx.type === 'email_batch') {
          todayStats.email++;
        } else if (tx.type === 'sms') {
          todayStats.sms++;
        } else if (tx.type === 'airtime') {
          todayStats.airtime++;
        } else if (tx.type === 'data') {
          todayStats.data++;
        }
      }
    }

    // Calculate monthly stats
    const monthlyStats = {
      email: 0,
      sms: 0,
      airtime: 0,
      data: 0,
      total: 0
    };

    // Track delivery status
    const deliveryStatus = {
      delivered: 0,
      sent: 0,
      failed: 0,
      bounced: 0,
      pending: 0
    };

    // Track by region (using stored region or detection from destination)
    const regionStats: Record<string, number> = {
      'West Africa': 0,
      'East Africa': 0,
      'North Africa': 0,
      'South Africa': 0,
      'Central Africa': 0,
      'Other': 0
    };

    if (monthlyTransactions.data) {
      for (const tx of monthlyTransactions.data) {
        monthlyStats.total++;
        
        // Count by type
        if (tx.type === 'email' || tx.type === 'email_batch') {
          monthlyStats.email++;
        } else if (tx.type === 'sms') {
          monthlyStats.sms++;
        } else if (tx.type === 'airtime') {
          monthlyStats.airtime++;
        } else if (tx.type === 'data') {
          monthlyStats.data++;
        }

        // Count delivery status
        if (tx.status === 'delivered') {
          deliveryStatus.delivered++;
        } else if (tx.status === 'sent') {
          deliveryStatus.sent++;
        } else if (tx.status === 'failed') {
          deliveryStatus.failed++;
        } else if (tx.status === 'bounced') {
          deliveryStatus.bounced++;
        } else if (tx.status === 'pending') {
          deliveryStatus.pending++;
        }

        // Detect region from destination using comprehensive detection
        // First check if region is stored in the transaction
        if (tx.region) {
          const normalizedRegion = normalizeRegionForDisplay(tx.region);
          regionStats[normalizedRegion] = (regionStats[normalizedRegion] || 0) + 1;
        } else {
          // Fall back to detection from destination
          const regionInfo = detectRegion(tx.destination || '');
          if (regionInfo) {
            const normalizedRegion = normalizeRegionForDisplay(regionInfo.region);
            regionStats[normalizedRegion] = (regionStats[normalizedRegion] || 0) + 1;
          } else {
            regionStats['Other']++;
          }
        }
      }
    }

    // Calculate percentages for delivery status
    const totalDelivery = deliveryStatus.delivered + deliveryStatus.sent + deliveryStatus.failed + deliveryStatus.bounced + deliveryStatus.pending;
    const deliveryPercentages = totalDelivery > 0 ? {
      delivered: ((deliveryStatus.delivered / totalDelivery) * 100).toFixed(1),
      sent: ((deliveryStatus.sent / totalDelivery) * 100).toFixed(1),
      failed: ((deliveryStatus.failed / totalDelivery) * 100).toFixed(1),
      bounced: ((deliveryStatus.bounced / totalDelivery) * 100).toFixed(1)
    } : {
      delivered: '0.0',
      sent: '0.0',
      failed: '0.0',
      bounced: '0.0'
    };

    // Calculate service usage percentages
    const servicePercentages = monthlyStats.total > 0 ? {
      email: Math.round((monthlyStats.email / monthlyStats.total) * 100),
      sms: Math.round((monthlyStats.sms / monthlyStats.total) * 100),
      airtime: Math.round((monthlyStats.airtime / monthlyStats.total) * 100),
      data: Math.round((monthlyStats.data / monthlyStats.total) * 100)
    } : {
      email: 0,
      sms: 0,
      airtime: 0,
      data: 0
    };

    // Format recent activity
    const formattedActivity = (recentActivity.data || []).map(tx => ({
      id: tx.id,
      type: tx.type,
      status: tx.status,
      destination: tx.destination,
      recipientCount: tx.recipient_count,
      createdAt: tx.created_at,
      timeAgo: getTimeAgo(new Date(tx.created_at))
    }));

    // Top endpoints based on usage
    const topEndpoints = [
      {
        path: '/api/v1/email/send',
        requests: monthlyStats.email,
        method: 'POST',
        change: calculateTrendChange(todayStats.email, monthlyStats.email / 30)
      },
      {
        path: '/api/v1/sms/send',
        requests: monthlyStats.sms,
        method: 'POST',
        change: calculateTrendChange(todayStats.sms, monthlyStats.sms / 30)
      },
      {
        path: '/api/v1/airtime/purchase',
        requests: monthlyStats.airtime,
        method: 'POST',
        change: calculateTrendChange(todayStats.airtime, monthlyStats.airtime / 30)
      }
    ].filter(e => e.requests > 0);

    return NextResponse.json({
      success: true,
      data: {
        customer: {
          name: customerData.data?.name || customerData.data?.company || 'Customer',
          plan: customerData.data?.plan || 'free',
          balance: customerData.data?.balance || 0
        },
        today: todayStats,
        monthly: monthlyStats,
        serviceUsage: servicePercentages,
        deliveryStatus: deliveryPercentages,
        regionStats,
        topEndpoints,
        recentActivity: formattedActivity,
        counts: {
          webhooks: webhookCount.count || 0,
          apiKeys: apiKeyCount.count || 0
        },
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return errorResponse('Failed to fetch dashboard stats', 500, 'INTERNAL_ERROR');
  }
}

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

// Helper function to calculate trend change percentage
function calculateTrendChange(todayCount: number, dailyAverage: number): number {
  if (dailyAverage === 0) return todayCount > 0 ? 100 : 0;
  return Math.round(((todayCount - dailyAverage) / dailyAverage) * 100);
}
