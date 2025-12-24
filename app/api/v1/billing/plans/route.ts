import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { validateApiKey, errorResponse } from '@/lib/api-helpers';

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

// GET /api/v1/billing/plans - Get all pricing plans
export async function GET(request: NextRequest) {
  try {
    const db = getSupabase();

    const { data: plans, error } = await db
      .from('pricing_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching plans:', error);
      return errorResponse('Failed to fetch pricing plans', 500, 'INTERNAL_ERROR');
    }

    // Transform to frontend-friendly format
    const formattedPlans = plans?.map(plan => ({
      id: plan.id,
      name: plan.name,
      displayName: plan.display_name,
      description: plan.description,
      pricing: {
        monthly: plan.price_monthly,
        yearly: plan.price_yearly,
        currency: plan.currency,
      },
      limits: {
        sms: plan.sms_limit,
        emails: plan.email_limit,
        dataGb: plan.data_limit_gb,
        airtimeGhs: plan.airtime_limit_ghs,
      },
      rateLimits: {
        global: {
          perMinute: plan.api_calls_per_minute,
          perHour: plan.api_calls_per_hour,
          perDay: plan.api_calls_per_day,
          perMonth: plan.api_calls_per_month,
        },
        sms: {
          perMinute: plan.sms_per_minute,
          perDay: plan.sms_per_day,
        },
        email: {
          perMinute: plan.email_per_minute,
          perDay: plan.email_per_day,
        },
        airtime: {
          perMinute: plan.airtime_per_minute,
          perDay: plan.airtime_per_day,
        },
        data: {
          perMinute: plan.data_per_minute,
          perDay: plan.data_per_day,
        },
      },
      features: plan.features,
      uptimeSla: plan.uptime_sla,
    }));

    return NextResponse.json({
      success: true,
      data: formattedPlans,
    });
  } catch (error) {
    console.error('Plans API error:', error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}
