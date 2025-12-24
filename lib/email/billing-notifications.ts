import { render } from '@react-email/render';
import { sendEmail } from './resend';
import {
  PaymentSuccessEmail,
  PaymentFailedEmail,
  SubscriptionCancelledEmail,
  UpcomingPaymentEmail,
  TrialEndingEmail,
  PaymentActionRequiredEmail,
} from './templates/billing';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sendcomms.com';

interface BaseNotificationParams {
  email: string;
  name: string;
  planName: string;
}

// ================================
// PAYMENT SUCCESS
// ================================
interface PaymentSuccessParams extends BaseNotificationParams {
  amount: number;
  currency: string;
  invoiceNumber: string;
  periodStart: Date;
  periodEnd: Date;
  invoiceUrl?: string;
}

export async function sendPaymentSuccessEmail(params: PaymentSuccessParams) {
  const {
    email,
    name,
    planName,
    amount,
    currency,
    invoiceNumber,
    periodStart,
    periodEnd,
    invoiceUrl,
  } = params;

  const html = await render(
    PaymentSuccessEmail({
      name,
      planName,
      amount,
      currency,
      invoiceNumber,
      periodStart: formatDate(periodStart),
      periodEnd: formatDate(periodEnd),
      invoiceUrl,
    })
  );

  const result = await sendEmail({
    to: email,
    subject: `Payment Successful - ${planName} Subscription`,
    html,
  });

  console.log(`[Billing Email] Payment success email sent to ${email}:`, result);
  return result;
}

// ================================
// PAYMENT FAILED
// ================================
interface PaymentFailedParams extends BaseNotificationParams {
  amount: number;
  currency: string;
  attemptCount: number;
  maxAttempts?: number;
  nextRetryDate?: Date;
  errorMessage?: string;
}

export async function sendPaymentFailedEmail(params: PaymentFailedParams) {
  const {
    email,
    name,
    planName,
    amount,
    currency,
    attemptCount,
    maxAttempts = 4,
    nextRetryDate,
    errorMessage,
  } = params;

  const html = await render(
    PaymentFailedEmail({
      name,
      planName,
      amount,
      currency,
      attemptCount,
      maxAttempts,
      nextRetryDate: nextRetryDate ? formatDate(nextRetryDate) : undefined,
      errorMessage,
      updatePaymentUrl: `${DASHBOARD_URL}/dashboard/billing`,
    })
  );

  const result = await sendEmail({
    to: email,
    subject: `⚠️ Action Required: Payment Failed for ${planName}`,
    html,
  });

  console.log(`[Billing Email] Payment failed email sent to ${email}:`, result);
  return result;
}

// ================================
// SUBSCRIPTION CANCELLED
// ================================
interface SubscriptionCancelledParams extends BaseNotificationParams {
  reason: 'user_cancelled' | 'payment_failed' | 'other';
  accessEndDate: Date;
}

export async function sendSubscriptionCancelledEmail(params: SubscriptionCancelledParams) {
  const { email, name, planName, reason, accessEndDate } = params;

  const html = await render(
    SubscriptionCancelledEmail({
      name,
      planName,
      reason,
      accessEndDate: formatDate(accessEndDate),
      resubscribeUrl: `${DASHBOARD_URL}/dashboard/billing/upgrade`,
    })
  );

  const subjectPrefix = reason === 'payment_failed' ? '⚠️ ' : '';
  const result = await sendEmail({
    to: email,
    subject: `${subjectPrefix}Your ${planName} Subscription Has Been Cancelled`,
    html,
  });

  console.log(`[Billing Email] Subscription cancelled email sent to ${email}:`, result);
  return result;
}

// ================================
// UPCOMING PAYMENT
// ================================
interface UpcomingPaymentParams extends BaseNotificationParams {
  amount: number;
  currency: string;
  paymentDate: Date;
}

export async function sendUpcomingPaymentEmail(params: UpcomingPaymentParams) {
  const { email, name, planName, amount, currency, paymentDate } = params;

  const html = await render(
    UpcomingPaymentEmail({
      name,
      planName,
      amount,
      currency,
      paymentDate: formatDate(paymentDate),
      billingUrl: `${DASHBOARD_URL}/dashboard/billing`,
    })
  );

  const result = await sendEmail({
    to: email,
    subject: `Upcoming Payment: ${currency} ${amount.toFixed(2)} on ${formatDate(paymentDate)}`,
    html,
  });

  console.log(`[Billing Email] Upcoming payment email sent to ${email}:`, result);
  return result;
}

// ================================
// TRIAL ENDING
// ================================
interface TrialEndingParams extends BaseNotificationParams {
  trialEndDate: Date;
  amount: number;
  currency: string;
}

export async function sendTrialEndingEmail(params: TrialEndingParams) {
  const { email, name, planName, trialEndDate, amount, currency } = params;

  const html = await render(
    TrialEndingEmail({
      name,
      planName,
      trialEndDate: formatDate(trialEndDate),
      amount,
      currency,
      upgradeUrl: `${DASHBOARD_URL}/dashboard/billing/upgrade`,
    })
  );

  const result = await sendEmail({
    to: email,
    subject: `⏰ Your ${planName} Trial Ends on ${formatDate(trialEndDate)}`,
    html,
  });

  console.log(`[Billing Email] Trial ending email sent to ${email}:`, result);
  return result;
}

// ================================
// PAYMENT ACTION REQUIRED (3D Secure)
// ================================
interface PaymentActionRequiredParams extends BaseNotificationParams {
  amount: number;
  currency: string;
  actionUrl: string;
}

export async function sendPaymentActionRequiredEmail(params: PaymentActionRequiredParams) {
  const { email, name, planName, amount, currency, actionUrl } = params;

  const html = await render(
    PaymentActionRequiredEmail({
      name,
      planName,
      amount,
      currency,
      actionUrl,
    })
  );

  const result = await sendEmail({
    to: email,
    subject: `🔐 Action Required: Complete Your Payment for ${planName}`,
    html,
  });

  console.log(`[Billing Email] Payment action required email sent to ${email}:`, result);
  return result;
}

// ================================
// HELPER FUNCTIONS
// ================================
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ================================
// BATCH NOTIFICATION HELPER
// ================================
export async function sendBillingNotification(
  type: 'payment_success' | 'payment_failed' | 'subscription_cancelled' | 'upcoming_payment' | 'trial_ending' | 'action_required',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any
) {
  switch (type) {
    case 'payment_success':
      return sendPaymentSuccessEmail(params);
    case 'payment_failed':
      return sendPaymentFailedEmail(params);
    case 'subscription_cancelled':
      return sendSubscriptionCancelledEmail(params);
    case 'upcoming_payment':
      return sendUpcomingPaymentEmail(params);
    case 'trial_ending':
      return sendTrialEndingEmail(params);
    case 'action_required':
      return sendPaymentActionRequiredEmail(params);
    default:
      throw new Error(`Unknown billing notification type: ${type}`);
  }
}
