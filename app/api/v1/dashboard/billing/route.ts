import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { validateApiKey, errorResponse } from '@/lib/api-helpers';

// GET /api/v1/dashboard/billing - Get billing info for dashboard (supports both auth methods)
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

    const db = createAdminClient();

    // Get subscription with plan details
    const { data: subscription, error: subError } = await db
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

    // If no subscription, return free plan defaults with usage from transactions
    if (subError && subError.code === 'PGRST116') {
      // Get free plan
      const { data: freePlan } = await db
        .from('pricing_plans')
        .select('*')
        .eq('name', 'free')
        .single();

      // Get usage from transactions this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: smsCount } = await db
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customerId)
        .eq('type', 'sms')
        .eq('status', 'sent')
        .gte('created_at', startOfMonth.toISOString());

      const { data: emailCount } = await db
        .from('transactions')
        .select('recipient_count', { count: 'exact', head: true })
        .eq('customer_id', customerId)
        .eq('type', 'email')
        .eq('status', 'sent')
        .gte('created_at', startOfMonth.toISOString());

      // Sum recipient counts for emails
      const { data: emailRecipients } = await db
        .from('transactions')
        .select('recipient_count')
        .eq('customer_id', customerId)
        .eq('type', 'email')
        .eq('status', 'sent')
        .gte('created_at', startOfMonth.toISOString());

      const totalEmails = emailRecipients?.reduce((sum, t) => sum + (t.recipient_count || 0), 0) || 0;

      const limits = {
        sms: freePlan?.sms_limit || 50,
        emails: freePlan?.email_limit || 500,
        dataGb: freePlan?.data_limit_gb || 1,
        airtimeGhs: freePlan?.airtime_limit_ghs || 10,
      };

      const smsUsed = Number(smsCount) || 0;
      const emailsUsed = totalEmails;

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
            limits,
            features: freePlan?.features || {},
          },
          usage: {
            sms: smsUsed,
            emails: emailsUsed,
            dataMb: 0,
            airtimeGhs: 0,
          },
          remaining: {
            sms: Math.max(0, limits.sms - smsUsed),
            emails: Math.max(0, limits.emails - emailsUsed),
            dataGb: limits.dataGb,
            airtimeGhs: limits.airtimeGhs,
          },
          billingCycle: 'monthly',
          status: 'active',
          currentPeriodStart: startOfMonth.toISOString(),
          currentPeriodEnd: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1).toISOString(),
        },
      });
    }

    if (subError) {
      console.error('Error fetching subscription:', subError);
      return errorResponse('Failed to fetch subscription', 500, 'INTERNAL_ERROR');
    }

    const plan = subscription.pricing_plans;
    const limits = {
      sms: plan.sms_limit || 50,
      emails: plan.email_limit || 500,
      dataGb: plan.data_limit_gb || 1,
      airtimeGhs: plan.airtime_limit_ghs || 10,
    };

    const usage = {
      sms: subscription.sms_used || 0,
      emails: subscription.email_used || 0,
      dataMb: subscription.data_used_mb || 0,
      airtimeGhs: subscription.airtime_used_ghs || 0,
    };

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
          limits,
          features: plan.features,
          uptimeSla: plan.uptime_sla,
        },
        usage,
        remaining: {
          sms: Math.max(0, limits.sms - usage.sms),
          emails: Math.max(0, limits.emails - usage.emails),
          dataGb: Math.max(0, limits.dataGb - (usage.dataMb / 1024)),
          airtimeGhs: Math.max(0, limits.airtimeGhs - usage.airtimeGhs),
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
    console.error('Dashboard billing API error:', error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}
