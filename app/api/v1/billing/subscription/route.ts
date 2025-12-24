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

// GET /api/v1/billing/subscription - Get current subscription
export async function GET(request: NextRequest) {
  try {
    // Validate API key
    const keyData = await validateApiKey(request);
    if (!keyData) {
      return errorResponse('Invalid or missing API key', 401, 'UNAUTHORIZED');
    }

    const customerId = keyData.customer_id;
    const db = getSupabase();

    // Get subscription with plan details
    const { data: subscription, error } = await db
      .from('subscriptions')
      .select(`
        *,
        pricing_plans (
          name,
          display_name,
          description,
          price_monthly,
          price_yearly,
          currency,
          sms_limit,
          email_limit,
          data_limit_gb,
          airtime_limit_ghs,
          features,
          uptime_sla
        )
      `)
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching subscription:', error);
      return errorResponse('Failed to fetch subscription', 500, 'INTERNAL_ERROR');
    }

    // If no subscription, return free plan defaults
    if (!subscription) {
      // Get free plan
      const { data: freePlan } = await db
        .from('pricing_plans')
        .select('*')
        .eq('name', 'free')
        .single();

      return NextResponse.json({
        success: true,
        data: {
          plan: {
            name: 'free',
            displayName: 'Free Plan',
            description: 'Perfect for testing and small projects.',
            pricing: {
              monthly: 0,
              yearly: 0,
              currency: 'USD',
            },
            limits: {
              sms: freePlan?.sms_limit || 50,
              emails: freePlan?.email_limit || 500,
              dataGb: freePlan?.data_limit_gb || 1,
              airtimeGhs: freePlan?.airtime_limit_ghs || 10,
            },
            features: freePlan?.features || {},
          },
          usage: {
            sms: 0,
            emails: 0,
            dataMb: 0,
            airtimeGhs: 0,
          },
          billingCycle: 'monthly',
          status: 'active',
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
    }

    const plan = subscription.pricing_plans;

    return NextResponse.json({
      success: true,
      data: {
        id: subscription.id,
        plan: {
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
          features: plan.features,
          uptimeSla: plan.uptime_sla,
        },
        usage: {
          sms: subscription.sms_used,
          emails: subscription.email_used,
          dataMb: subscription.data_used_mb,
          airtimeGhs: subscription.airtime_used_ghs,
        },
        billingCycle: subscription.billing_cycle,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        trialStart: subscription.trial_start,
        trialEnd: subscription.trial_end,
      },
    });
  } catch (error) {
    console.error('Subscription API error:', error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}
