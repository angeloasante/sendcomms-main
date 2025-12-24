import { NextRequest, NextResponse } from 'next/server';
import {
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCancelledEmail,
  sendUpcomingPaymentEmail,
  sendTrialEndingEmail,
  sendPaymentActionRequiredEmail,
} from '@/lib/email/billing-notifications';

// Test endpoint to send sample billing emails
// Usage: POST /api/test-billing-emails?type=payment_success&email=test@example.com
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'all';
  const email = searchParams.get('email') || 'angeloasante958@gmail.com';
  const name = searchParams.get('name') || 'Test User';

  const results: Record<string, unknown> = {};

  try {
    // Common test data
    const planName = 'Pro';
    const amount = 29;
    const currency = 'USD';
    const testDate = new Date();
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    if (type === 'all' || type === 'payment_success') {
      results.payment_success = await sendPaymentSuccessEmail({
        email,
        name,
        planName,
        amount,
        currency,
        invoiceNumber: 'INV-TEST-001',
        periodStart: testDate,
        periodEnd: futureDate,
        invoiceUrl: 'https://invoice.stripe.com/test',
      });
    }

    if (type === 'all' || type === 'payment_failed') {
      results.payment_failed = await sendPaymentFailedEmail({
        email,
        name,
        planName,
        amount,
        currency,
        attemptCount: 2,
        maxAttempts: 4,
        nextRetryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        errorMessage: 'Your card was declined. Please try a different payment method.',
      });
    }

    if (type === 'all' || type === 'subscription_cancelled') {
      results.subscription_cancelled = await sendSubscriptionCancelledEmail({
        email,
        name,
        planName,
        reason: 'user_cancelled',
        accessEndDate: futureDate,
      });
    }

    if (type === 'all' || type === 'upcoming_payment') {
      results.upcoming_payment = await sendUpcomingPaymentEmail({
        email,
        name,
        planName,
        amount,
        currency,
        paymentDate: futureDate,
      });
    }

    if (type === 'all' || type === 'trial_ending') {
      results.trial_ending = await sendTrialEndingEmail({
        email,
        name,
        planName,
        trialEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        amount,
        currency,
      });
    }

    if (type === 'all' || type === 'action_required') {
      results.action_required = await sendPaymentActionRequiredEmail({
        email,
        name,
        planName,
        amount,
        currency,
        actionUrl: 'https://checkout.stripe.com/test-3dsecure',
      });
    }

    return NextResponse.json({
      success: true,
      message: `Test emails sent to ${email}`,
      results,
      types_sent: Object.keys(results),
    });
  } catch (error) {
    console.error('Error sending test emails:', error);
    return NextResponse.json(
      { error: 'Failed to send test emails', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint for easy testing via browser
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Use POST to send test billing emails',
    usage: {
      endpoint: 'POST /api/test-billing-emails',
      params: {
        type: 'payment_success | payment_failed | subscription_cancelled | upcoming_payment | trial_ending | action_required | all',
        email: 'recipient email address',
        name: 'recipient name',
      },
      example: 'POST /api/test-billing-emails?type=all&email=test@example.com',
    },
  });
}
