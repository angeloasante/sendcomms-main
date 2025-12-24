import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Please log in' },
      }, { status: 401 });
    }

    const db = createAdminClient();

    // Get customer record
    const { data: customer } = await db
      .from('customers')
      .select('id, stripe_customer_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!customer) {
      // Try finding by email
      const { data: customerByEmail } = await db
        .from('customers')
        .select('id, stripe_customer_id')
        .eq('email', user.email)
        .single();
      
      if (!customerByEmail) {
        return NextResponse.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Customer not found' },
        }, { status: 404 });
      }
    }

    const customerId = customer?.id;
    const stripeCustomerId = customer?.stripe_customer_id;

    // Get the active subscription
    const { data: subscription } = await db
      .from('subscriptions')
      .select('id, stripe_subscription_id')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .single();

    if (!subscription) {
      return NextResponse.json({
        success: false,
        error: { code: 'NO_SUBSCRIPTION', message: 'No active subscription found' },
      }, { status: 404 });
    }

    // Cancel on Stripe if we have a Stripe subscription ID
    if (subscription.stripe_subscription_id) {
      try {
        // Cancel at period end (don't immediately revoke access)
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          cancel_at_period_end: true,
        });
      } catch (stripeError) {
        console.error('Stripe cancellation error:', stripeError);
        // Continue with local cancellation even if Stripe fails
      }
    }

    // Update local subscription status
    await db
      .from('subscriptions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    // Get free plan and downgrade customer
    const { data: freePlan } = await db
      .from('pricing_plans')
      .select('id')
      .eq('name', 'free')
      .single();

    if (freePlan) {
      await db
        .from('subscriptions')
        .update({ plan_id: freePlan.id })
        .eq('id', subscription.id);
    }

    await db
      .from('customers')
      .update({ plan: 'free' })
      .eq('id', customerId);

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully. You will retain access until the end of your billing period.',
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel subscription' },
    }, { status: 500 });
  }
}
