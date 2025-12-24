import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { validateApiKey } from '@/lib/api-helpers';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY || '');

// Stripe price IDs mapped to our plans
// You'll need to create these products/prices in your Stripe dashboard
const STRIPE_PRICE_IDS: Record<string, { monthly: string; yearly: string }> = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || '',
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
  },
  business: {
    monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY || '',
  },
};

// Fallback: Create dynamic prices if not pre-configured
const PLAN_PRICES: Record<string, { monthly: number; yearly: number; name: string }> = {
  starter: { monthly: 2900, yearly: 27900, name: 'Starter Plan' },
  pro: { monthly: 9900, yearly: 95000, name: 'Pro Plan' },
  business: { monthly: 29900, yearly: 287000, name: 'Business Plan' },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan, billing_cycle } = body;

    if (!plan || !billing_cycle) {
      return NextResponse.json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'Plan and billing cycle are required' },
      }, { status: 400 });
    }

    if (!['starter', 'pro', 'business'].includes(plan)) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_PLAN', message: 'Invalid plan selected' },
      }, { status: 400 });
    }

    if (!['monthly', 'yearly'].includes(billing_cycle)) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_BILLING', message: 'Invalid billing cycle' },
      }, { status: 400 });
    }

    let customer: { id: string; email: string; name: string; stripe_customer_id: string | null } | null = null;
    const db = createAdminClient();

    // First try API key auth
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const keyData = await validateApiKey(req);
      if (keyData) {
        const { data: apiCustomer } = await db
          .from('customers')
          .select('id, email, name, stripe_customer_id')
          .eq('id', keyData.customer_id)
          .single();
        
        if (apiCustomer) {
          customer = apiCustomer;
        }
      }
    }

    // If no API key auth, try session-based auth
    if (!customer) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Please log in to upgrade' },
        }, { status: 401 });
      }

      // Get customer record - try by auth_user_id first, then by email
      const { data: authCustomer } = await db
        .from('customers')
        .select('id, email, name, stripe_customer_id')
        .eq('auth_user_id', user.id)
        .single();

      if (authCustomer) {
        customer = authCustomer;
      } else if (user.email) {
        // Fallback: find by email if not linked by auth_user_id
        const { data: customerByEmail } = await db
          .from('customers')
          .select('id, email, name, stripe_customer_id')
          .eq('email', user.email)
          .single();
        
        if (customerByEmail) {
          customer = customerByEmail;
          // Link the customer to the auth user for future lookups
          await db
            .from('customers')
            .update({ auth_user_id: user.id })
            .eq('id', customerByEmail.id);
        }
      }

      // Create new customer if not found
      if (!customer && user.email) {
        const { data: newCustomer, error: createError } = await db
          .from('customers')
          .insert({
            email: user.email,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Customer',
            auth_user_id: user.id,
            plan: 'free',
            is_active: true,
          })
          .select('id, email, name, stripe_customer_id')
          .single();
        
        if (!createError && newCustomer) {
          customer = newCustomer;
        }
      }
    }

    if (!customer) {
      return NextResponse.json({
        success: false,
        error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer record not found. Please contact support.' },
      }, { status: 404 });
    }

    // Create or retrieve Stripe customer
    let stripeCustomerId = customer.stripe_customer_id;

    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        email: customer.email,
        name: customer.name,
        metadata: {
          sendcomms_customer_id: customer.id,
        },
      });
      stripeCustomerId = stripeCustomer.id;

      // Save Stripe customer ID
      await db
        .from('customers')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', customer.id);
    }

    // Get or create Stripe Price
    let priceId = STRIPE_PRICE_IDS[plan]?.[billing_cycle as 'monthly' | 'yearly'];
    
    if (!priceId) {
      // Create a dynamic price if not pre-configured
      const planInfo = PLAN_PRICES[plan];
      const price = await stripe.prices.create({
        unit_amount: billing_cycle === 'monthly' ? planInfo.monthly : planInfo.yearly,
        currency: 'usd',
        recurring: {
          interval: billing_cycle === 'monthly' ? 'month' : 'year',
        },
        product_data: {
          name: planInfo.name,
          metadata: {
            plan_name: plan,
            billing_cycle,
          },
        },
      });
      priceId = price.id;
    }

    // Create Stripe Checkout Session
    // Determine the correct base URL for redirects
    const getBaseUrl = () => {
      // 1. Check for explicit env var (recommended for production)
      if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL;
      }
      // 2. Use Vercel's automatic URL detection
      if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
      }
      // 3. Fallback to request origin (works for both local and deployed)
      return req.nextUrl.origin;
    };
    
    const baseUrl = getBaseUrl();
    const successUrl = process.env.STRIPE_SUCCESS_URL?.startsWith('http') 
      ? process.env.STRIPE_SUCCESS_URL 
      : `${baseUrl}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = process.env.STRIPE_CANCEL_URL?.startsWith('http')
      ? process.env.STRIPE_CANCEL_URL
      : `${baseUrl}/dashboard/billing/upgrade?plan=${plan}`;

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        customer_id: customer.id,
        plan,
        billing_cycle,
      },
      subscription_data: {
        metadata: {
          customer_id: customer.id,
          plan,
          billing_cycle,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      session_id: session.id,
    });

  } catch (error: unknown) {
    console.error('Stripe checkout error:', error);
    
    if (error instanceof Error && 'type' in error) {
      return NextResponse.json({
        success: false,
        error: { code: 'STRIPE_ERROR', message: error.message },
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create checkout session' },
    }, { status: 500 });
  }
}
