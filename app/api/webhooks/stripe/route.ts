import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import {
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCancelledEmail,
  sendUpcomingPaymentEmail,
  sendTrialEndingEmail,
  sendPaymentActionRequiredEmail,
} from '@/lib/email/billing-notifications';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY || '');

// Initialize Supabase with service role for webhooks
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Map Stripe plan metadata to our plan IDs
async function getPlanByName(planName: string) {
  const { data } = await supabase
    .from('pricing_plans')
    .select('id, name')
    .eq('name', planName)
    .single();
  return data;
}

// Get customer by Stripe customer ID
async function getCustomerByStripeId(stripeCustomerId: string) {
  const { data } = await supabase
    .from('customers')
    .select('id, email, name')
    .eq('stripe_customer_id', stripeCustomerId)
    .single();
  return data;
}

// Log billing event for audit trail
async function logBillingEvent(
  customerId: string, 
  eventType: string, 
  details: Record<string, unknown>
) {
  try {
    await supabase.from('billing_events').insert({
      customer_id: customerId,
      event_type: eventType,
      details,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Table might not exist, log to console instead
    console.log(`Billing event [${eventType}] for customer ${customerId}:`, details);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // For testing without webhook secret
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log(`Stripe webhook received: ${event.type}`);

  try {
    switch (event.type) {
      // ==========================================
      // CHECKOUT EVENTS
      // ==========================================
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`Checkout session expired: ${session.id}`);
        // Could notify user that their checkout expired
        break;
      }

      // ==========================================
      // SUBSCRIPTION LIFECYCLE EVENTS
      // ==========================================
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(subscription);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancelled(subscription);
        break;
      }

      case 'customer.subscription.paused': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionPaused(subscription);
        break;
      }

      case 'customer.subscription.resumed': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionResumed(subscription);
        break;
      }

      case 'customer.subscription.trial_will_end': {
        // Fires 3 days before trial ends
        const subscription = event.data.object as Stripe.Subscription;
        await handleTrialWillEnd(subscription);
        break;
      }

      // ==========================================
      // INVOICE EVENTS (Monthly/Yearly Billing)
      // ==========================================
      case 'invoice.created': {
        // New invoice created (start of billing cycle)
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`Invoice created: ${invoice.id} for ${invoice.customer}`);
        break;
      }

      case 'invoice.finalized': {
        // Invoice is ready to be paid
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`Invoice finalized: ${invoice.id}, amount: $${(invoice.amount_due || 0) / 100}`);
        break;
      }

      case 'invoice.paid': {
        // SUCCESS: Payment went through
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        // FAILURE: Payment didn't go through
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceFailed(invoice);
        break;
      }

      case 'invoice.payment_action_required': {
        // Customer needs to complete action (3D Secure, etc.)
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentActionRequired(invoice);
        break;
      }

      case 'invoice.upcoming': {
        // Fires a few days before the next invoice
        const invoice = event.data.object as Stripe.Invoice;
        await handleUpcomingInvoice(invoice);
        break;
      }

      case 'invoice.marked_uncollectible': {
        // Invoice marked as uncollectible after all retries failed
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceUncollectible(invoice);
        break;
      }

      // ==========================================
      // PAYMENT INTENT EVENTS
      // ==========================================
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(paymentIntent);
        break;
      }

      case 'payment_intent.requires_action': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment requires action: ${paymentIntent.id}`);
        break;
      }

      // ==========================================
      // CHARGE EVENTS (for refunds, disputes)
      // ==========================================
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        await handleDisputeCreated(dispute);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const customerId = session.metadata?.customer_id;
  const planName = session.metadata?.plan;
  const billingCycle = session.metadata?.billing_cycle;

  if (!customerId || !planName) {
    console.error('Missing metadata in checkout session');
    return;
  }

  console.log(`Checkout complete for customer ${customerId}, plan: ${planName}`);

  // Get the plan from our database
  const plan = await getPlanByName(planName);
  if (!plan) {
    console.error(`Plan not found: ${planName}`);
    return;
  }

  // Update or create subscription
  const now = new Date();
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === 'yearly' ? 12 : 1));

  // Check if subscription exists
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('customer_id', customerId)
    .single();

  if (existingSub) {
    // Update existing subscription
    await supabase
      .from('subscriptions')
      .update({
        plan_id: plan.id,
        status: 'active',
        billing_cycle: billingCycle,
        stripe_subscription_id: session.subscription as string,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        // Reset usage for new billing period
        sms_used: 0,
        email_used: 0,
        data_used_mb: 0,
        airtime_used_ghs: 0,
        failed_payment_count: 0, // Reset failed payment count
        updated_at: now.toISOString(),
      })
      .eq('customer_id', customerId);
  } else {
    // Create new subscription
    await supabase
      .from('subscriptions')
      .insert({
        customer_id: customerId,
        plan_id: plan.id,
        status: 'active',
        billing_cycle: billingCycle,
        stripe_subscription_id: session.subscription as string,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      });
  }

  // Update customer plan
  await supabase
    .from('customers')
    .update({ plan: planName })
    .eq('id', customerId);

  await logBillingEvent(customerId, 'checkout_complete', {
    plan: planName,
    billing_cycle: billingCycle,
    stripe_session_id: session.id,
  });

  console.log(`Subscription updated for customer ${customerId}`);
}

// New subscription created
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = subscription.metadata?.customer_id;
  if (!customerId) {
    // Try to find customer by Stripe customer ID
    const customer = await getCustomerByStripeId(subscription.customer as string);
    if (customer) {
      await logBillingEvent(customer.id, 'subscription_created', {
        stripe_subscription_id: subscription.id,
        status: subscription.status,
      });
    }
    return;
  }

  await logBillingEvent(customerId, 'subscription_created', {
    stripe_subscription_id: subscription.id,
    status: subscription.status,
  });
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.metadata?.customer_id;
  
  // If no customer ID in metadata, try to find by Stripe customer ID
  let resolvedCustomerId = customerId;
  if (!resolvedCustomerId) {
    const customer = await getCustomerByStripeId(subscription.customer as string);
    if (customer) {
      resolvedCustomerId = customer.id;
    } else {
      console.log('Could not resolve customer for subscription update');
      return;
    }
  }

  const status = subscription.status === 'active' ? 'active' 
    : subscription.status === 'past_due' ? 'past_due'
    : subscription.status === 'canceled' ? 'cancelled'
    : subscription.status === 'trialing' ? 'trialing'
    : subscription.status === 'unpaid' ? 'unpaid'
    : subscription.status === 'paused' ? 'paused'
    : 'active';

  // Get period dates from subscription (use type assertion for API compatibility)
  const subData = subscription as unknown as { current_period_start?: number; current_period_end?: number };
  const periodStart = subData.current_period_start;
  const periodEnd = subData.current_period_end;

  const updateData: Record<string, unknown> = {
    status,
    stripe_subscription_id: subscription.id,
    updated_at: new Date().toISOString(),
  };

  if (periodStart) {
    updateData.current_period_start = new Date(periodStart * 1000).toISOString();
  }
  if (periodEnd) {
    updateData.current_period_end = new Date(periodEnd * 1000).toISOString();
  }

  // If subscription is active, reset failed payment count
  if (status === 'active') {
    updateData.failed_payment_count = 0;
  }

  await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('customer_id', resolvedCustomerId);

  await logBillingEvent(resolvedCustomerId, 'subscription_updated', {
    status,
    stripe_subscription_id: subscription.id,
    cancel_at_period_end: subscription.cancel_at_period_end,
  });
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const customerId = subscription.metadata?.customer_id;
  
  let resolvedCustomerId = customerId;
  let customerEmail: string | undefined;
  let customerName: string | undefined;

  if (!resolvedCustomerId) {
    const customer = await getCustomerByStripeId(subscription.customer as string);
    if (customer) {
      resolvedCustomerId = customer.id;
      customerEmail = customer.email;
      customerName = customer.name;
    } else {
      return;
    }
  } else {
    // Get customer info for email
    const { data: customer } = await supabase
      .from('customers')
      .select('email, name')
      .eq('id', resolvedCustomerId)
      .single();
    customerEmail = customer?.email;
    customerName = customer?.name;
  }

  // Get free plan
  const freePlan = await getPlanByName('free');
  if (!freePlan) return;

  const previousPlan = subscription.metadata?.plan || 'Subscription';
  // Use type assertion for API compatibility
  const subData = subscription as unknown as { current_period_end?: number };
  const accessEndDate = subData.current_period_end 
    ? new Date(subData.current_period_end * 1000) 
    : new Date();

  // Downgrade to free plan
  await supabase
    .from('subscriptions')
    .update({
      plan_id: freePlan.id,
      status: 'cancelled',
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('customer_id', resolvedCustomerId);

  await supabase
    .from('customers')
    .update({ plan: 'free' })
    .eq('id', resolvedCustomerId);

  const cancellationReason = subscription.cancellation_details?.reason;
  await logBillingEvent(resolvedCustomerId, 'subscription_cancelled', {
    previous_plan: previousPlan,
    cancellation_reason: cancellationReason || 'user_cancelled',
  });

  // Send cancellation email
  if (customerEmail) {
    await sendSubscriptionCancelledEmail({
      email: customerEmail,
      name: customerName || 'Valued Customer',
      planName: previousPlan,
      reason: cancellationReason === 'cancellation_requested' ? 'user_cancelled' : 
              cancellationReason === 'payment_disputed' ? 'payment_failed' : 'user_cancelled',
      accessEndDate,
    });
  }

  console.log(`Subscription cancelled for customer ${resolvedCustomerId}`);
}

// Subscription paused (e.g., due to failed payments)
async function handleSubscriptionPaused(subscription: Stripe.Subscription) {
  const customer = await getCustomerByStripeId(subscription.customer as string);
  if (!customer) return;

  await supabase
    .from('subscriptions')
    .update({
      status: 'paused',
      updated_at: new Date().toISOString(),
    })
    .eq('customer_id', customer.id);

  await logBillingEvent(customer.id, 'subscription_paused', {
    stripe_subscription_id: subscription.id,
  });

  console.log(`Subscription paused for customer ${customer.id}`);
}

// Subscription resumed after being paused
async function handleSubscriptionResumed(subscription: Stripe.Subscription) {
  const customer = await getCustomerByStripeId(subscription.customer as string);
  if (!customer) return;

  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      failed_payment_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('customer_id', customer.id);

  await logBillingEvent(customer.id, 'subscription_resumed', {
    stripe_subscription_id: subscription.id,
  });

  console.log(`Subscription resumed for customer ${customer.id}`);
}

// Trial ending soon - notify customer
async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const customer = await getCustomerByStripeId(subscription.customer as string);
  if (!customer) return;

  // Get plan info
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('pricing_plans(name, monthly_price)')
    .eq('customer_id', customer.id)
    .single();

  const planName = (sub?.pricing_plans as unknown as { name: string; monthly_price: number })?.name || 'Pro';
  const monthlyPrice = (sub?.pricing_plans as unknown as { name: string; monthly_price: number })?.monthly_price || 29;

  await logBillingEvent(customer.id, 'trial_ending_soon', {
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    stripe_subscription_id: subscription.id,
  });

  // Send email notification about trial ending
  if (customer.email) {
    await sendTrialEndingEmail({
      email: customer.email,
      name: customer.name || 'Valued Customer',
      planName,
      trialEndDate: subscription.trial_end ? new Date(subscription.trial_end * 1000) : new Date(),
      amount: monthlyPrice,
      currency: 'USD',
    });
  }

  console.log(`Trial ending soon for customer ${customer.id}`);
}

// ===========================================
// INVOICE HANDLERS
// ===========================================

// Upcoming invoice notification (fires ~3 days before billing)
async function handleUpcomingInvoice(invoice: Stripe.Invoice) {
  const customer = await getCustomerByStripeId(invoice.customer as string);
  if (!customer) return;

  const amount = (invoice.amount_due || 0) / 100;
  const paymentDate = invoice.next_payment_attempt 
    ? new Date(invoice.next_payment_attempt * 1000) 
    : new Date();

  // Get plan name from subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('pricing_plans(name)')
    .eq('customer_id', customer.id)
    .single();

  const planName = (sub?.pricing_plans as unknown as { name: string })?.name || 'Subscription';
  
  await logBillingEvent(customer.id, 'invoice_upcoming', {
    amount,
    currency: invoice.currency,
    billing_date: paymentDate.toISOString(),
  });

  // Send upcoming payment email reminder
  if (customer.email) {
    await sendUpcomingPaymentEmail({
      email: customer.email,
      name: customer.name || 'Valued Customer',
      planName,
      amount,
      currency: invoice.currency.toUpperCase(),
      paymentDate,
    });
  }

  console.log(`Upcoming invoice for customer ${customer.id}: $${amount}`);
}

// Invoice paid successfully - this fires for every successful monthly/yearly charge
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const stripeCustomerId = invoice.customer as string;
  
  // Check if this is a subscription invoice by billing_reason
  const isSubscriptionInvoice = invoice.billing_reason?.includes('subscription');
  
  // Get subscription ID from the first line item
  const firstLineItem = invoice.lines.data[0];
  const subscriptionId = firstLineItem?.subscription as string | undefined;
  
  // Find our customer by Stripe customer ID
  const customer = await getCustomerByStripeId(stripeCustomerId);
  if (!customer) {
    console.error(`Customer not found for Stripe ID: ${stripeCustomerId}`);
    return;
  }

  // Create invoice record in our database
  await supabase
    .from('invoices')
    .upsert({
      customer_id: customer.id,
      stripe_invoice_id: invoice.id,
      invoice_number: invoice.number || `INV-${Date.now()}`,
      amount: (invoice.amount_paid || 0) / 100,
      currency: invoice.currency.toUpperCase(),
      status: 'paid',
      paid_at: new Date().toISOString(),
      description: invoice.lines.data[0]?.description || 'Subscription payment',
      plan_name: invoice.lines.data[0]?.description || 'Subscription',
      metadata: {
        stripe_subscription: subscriptionId,
        billing_reason: invoice.billing_reason,
      },
    }, {
      onConflict: 'stripe_invoice_id',
    });

  // If this is a subscription renewal (not the first payment), update the billing period
  if (subscriptionId && invoice.billing_reason === 'subscription_cycle') {
    const periodStart = invoice.lines.data[0]?.period?.start;
    const periodEnd = invoice.lines.data[0]?.period?.end;
    
    if (periodStart && periodEnd) {
      // Update subscription dates and reset usage for new period
      await supabase
        .from('subscriptions')
        .update({
          current_period_start: new Date(periodStart * 1000).toISOString(),
          current_period_end: new Date(periodEnd * 1000).toISOString(),
          status: 'active',
          // Reset usage for new billing period
          sms_used: 0,
          email_used: 0,
          data_used_mb: 0,
          airtime_used_ghs: 0,
          // Reset failed payment count on successful payment
          failed_payment_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('customer_id', customer.id);

      console.log(`🔄 Subscription renewed for customer ${customer.id} - Usage reset for new period`);
    }
  }

  await logBillingEvent(customer.id, 'invoice_paid', {
    invoice_id: invoice.id,
    amount: (invoice.amount_paid || 0) / 100,
    billing_reason: invoice.billing_reason,
  });

  // Send payment success email
  if (customer.email) {
    const periodStart = invoice.lines.data[0]?.period?.start;
    const periodEnd = invoice.lines.data[0]?.period?.end;
    
    await sendPaymentSuccessEmail({
      email: customer.email,
      name: customer.name || 'Valued Customer',
      planName: invoice.lines.data[0]?.description || 'Subscription',
      amount: (invoice.amount_paid || 0) / 100,
      currency: invoice.currency.toUpperCase(),
      invoiceNumber: invoice.number || `INV-${Date.now()}`,
      periodStart: periodStart ? new Date(periodStart * 1000) : new Date(),
      periodEnd: periodEnd ? new Date(periodEnd * 1000) : new Date(),
      invoiceUrl: invoice.hosted_invoice_url || undefined,
    });
  }

  console.log(`✅ Invoice ${invoice.id} paid for customer ${customer.id}`);
}

// Payment failed - handle retries and grace period
async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const stripeCustomerId = invoice.customer as string;
  
  const customer = await getCustomerByStripeId(stripeCustomerId);
  if (!customer) return;

  // Get current subscription to track failed payment count
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, failed_payment_count, status')
    .eq('customer_id', customer.id)
    .single();

  const currentFailCount = (subscription?.failed_payment_count || 0) + 1;
  const maxRetries = 4; // Stripe typically retries 4 times over ~3 weeks

  // Update subscription with failed payment info
  await supabase
    .from('subscriptions')
    .update({ 
      status: 'past_due',
      failed_payment_count: currentFailCount,
      last_payment_error: invoice.last_finalization_error?.message || 'Payment failed',
      updated_at: new Date().toISOString(),
    })
    .eq('customer_id', customer.id);

  // Create failed invoice record
  await supabase
    .from('invoices')
    .upsert({
      customer_id: customer.id,
      stripe_invoice_id: invoice.id,
      invoice_number: invoice.number || `INV-${Date.now()}`,
      amount: (invoice.amount_due || 0) / 100,
      currency: invoice.currency.toUpperCase(),
      status: 'overdue',
      description: `Payment failed (attempt ${currentFailCount}/${maxRetries})`,
    }, {
      onConflict: 'stripe_invoice_id',
    });

  await logBillingEvent(customer.id, 'payment_failed', {
    invoice_id: invoice.id,
    amount: (invoice.amount_due || 0) / 100,
    attempt_count: currentFailCount,
    next_retry: invoice.next_payment_attempt 
      ? new Date(invoice.next_payment_attempt * 1000).toISOString() 
      : null,
    error: invoice.last_finalization_error?.message,
  });

  // Send payment failed email notification
  if (customer.email) {
    // Get plan name
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('pricing_plans(name)')
      .eq('customer_id', customer.id)
      .single();

    const planName = (sub?.pricing_plans as unknown as { name: string })?.name || 'Subscription';

    await sendPaymentFailedEmail({
      email: customer.email,
      name: customer.name || 'Valued Customer',
      planName,
      amount: (invoice.amount_due || 0) / 100,
      currency: invoice.currency.toUpperCase(),
      attemptCount: currentFailCount,
      maxAttempts: maxRetries,
      nextRetryDate: invoice.next_payment_attempt 
        ? new Date(invoice.next_payment_attempt * 1000) 
        : undefined,
      errorMessage: invoice.last_finalization_error?.message || 'Payment could not be processed',
    });
  }

  console.log(`❌ Payment failed for customer ${customer.id} (attempt ${currentFailCount}/${maxRetries})`);
  
  if (invoice.next_payment_attempt) {
    console.log(`   Next retry: ${new Date(invoice.next_payment_attempt * 1000).toISOString()}`);
  }
}

// Payment requires additional action (3D Secure, etc.)
async function handlePaymentActionRequired(invoice: Stripe.Invoice) {
  const customer = await getCustomerByStripeId(invoice.customer as string);
  if (!customer) return;

  await supabase
    .from('subscriptions')
    .update({ 
      status: 'past_due',
      last_payment_error: 'Payment requires additional authentication',
      updated_at: new Date().toISOString(),
    })
    .eq('customer_id', customer.id);

  await logBillingEvent(customer.id, 'payment_action_required', {
    invoice_id: invoice.id,
    hosted_invoice_url: invoice.hosted_invoice_url,
  });

  // Send email with link to complete payment
  if (customer.email) {
    // Get plan name
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('pricing_plans(name)')
      .eq('customer_id', customer.id)
      .single();

    const planName = (sub?.pricing_plans as unknown as { name: string })?.name || 'Subscription';

    await sendPaymentActionRequiredEmail({
      email: customer.email,
      name: customer.name || 'Valued Customer',
      planName,
      amount: (invoice.amount_due || 0) / 100,
      currency: invoice.currency.toUpperCase(),
      actionUrl: invoice.hosted_invoice_url || 'https://sendcomms.com/dashboard/billing',
    });
  }

  console.log(`⚠️ Payment action required for customer ${customer.id}`);
}

// Invoice marked uncollectible after all retries failed
async function handleInvoiceUncollectible(invoice: Stripe.Invoice) {
  const customer = await getCustomerByStripeId(invoice.customer as string);
  if (!customer) return;

  // Get free plan and downgrade
  const freePlan = await getPlanByName('free');
  if (freePlan) {
    await supabase
      .from('subscriptions')
      .update({
        plan_id: freePlan.id,
        status: 'cancelled',
        stripe_subscription_id: null,
        last_payment_error: 'All payment attempts failed',
        updated_at: new Date().toISOString(),
      })
      .eq('customer_id', customer.id);

    await supabase
      .from('customers')
      .update({ plan: 'free' })
      .eq('id', customer.id);
  }

  await logBillingEvent(customer.id, 'subscription_cancelled_payment_failed', {
    invoice_id: invoice.id,
    amount_due: (invoice.amount_due || 0) / 100,
  });

  // Send final email about subscription cancellation due to payment failure
  if (customer.email) {
    await sendSubscriptionCancelledEmail({
      email: customer.email,
      name: customer.name || 'Valued Customer',
      planName: invoice.lines.data[0]?.description || 'Subscription',
      reason: 'payment_failed',
      accessEndDate: new Date(), // Immediate cancellation
    });
  }

  console.log(`🚫 Subscription cancelled for customer ${customer.id} due to failed payments`);
}

// ===========================================
// PAYMENT INTENT HANDLERS
// ===========================================

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const stripeCustomerId = paymentIntent.customer as string;
  if (!stripeCustomerId) return;

  const customer = await getCustomerByStripeId(stripeCustomerId);
  if (!customer) return;

  const errorMessage = paymentIntent.last_payment_error?.message || 'Unknown error';
  const errorCode = paymentIntent.last_payment_error?.code;

  await logBillingEvent(customer.id, 'payment_intent_failed', {
    payment_intent_id: paymentIntent.id,
    error_message: errorMessage,
    error_code: errorCode,
    decline_code: paymentIntent.last_payment_error?.decline_code,
  });

  console.log(`Payment intent failed for customer ${customer.id}: ${errorMessage}`);
}

// ===========================================
// CHARGE/REFUND HANDLERS
// ===========================================

async function handleChargeRefunded(charge: Stripe.Charge) {
  const stripeCustomerId = charge.customer as string;
  if (!stripeCustomerId) return;

  const customer = await getCustomerByStripeId(stripeCustomerId);
  if (!customer) return;

  const refundAmount = (charge.amount_refunded || 0) / 100;

  await logBillingEvent(customer.id, 'charge_refunded', {
    charge_id: charge.id,
    amount_refunded: refundAmount,
    currency: charge.currency,
  });

  console.log(`Refund processed for customer ${customer.id}: $${refundAmount}`);
}

async function handleDisputeCreated(dispute: Stripe.Dispute) {
  const charge = dispute.charge as string;
  
  // Get the charge to find customer
  try {
    const chargeObj = await stripe.charges.retrieve(charge);
    const stripeCustomerId = chargeObj.customer as string;
    
    if (stripeCustomerId) {
      const customer = await getCustomerByStripeId(stripeCustomerId);
      if (customer) {
        await logBillingEvent(customer.id, 'dispute_created', {
          dispute_id: dispute.id,
          charge_id: charge,
          amount: dispute.amount / 100,
          reason: dispute.reason,
        });

        console.log(`⚠️ Dispute created for customer ${customer.id}: ${dispute.reason}`);
      }
    }
  } catch (err) {
    console.error('Error handling dispute:', err);
  }
}
