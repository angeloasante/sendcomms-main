# SendComms Billing System Documentation

## Overview

The SendComms billing system provides comprehensive subscription management, payment processing, and invoice tracking. This document outlines the database schema, API endpoints, and pricing tiers.

## Pricing Tiers

| Plan | Price | SMS/mo | Emails/mo | Data | Airtime (GHS) |
|------|-------|--------|-----------|------|---------------|
| **Free** | $0/mo | 50 | 500 | 1GB | 10 |
| **Starter** | $29/mo | 300 | 2,000 | 5GB | 30 |
| **Pro** | $99/mo | 1,500 | 10,000 | 30GB | 150 |
| **Business** | $299/mo | 6,000 | 40,000 | 150GB | 600 |
| **Enterprise** | Custom | Unlimited | Unlimited | Unlimited | Custom |

### Rate Limits by Plan

| Plan | Per Minute | Per Hour | Per Day | Per Month |
|------|------------|----------|---------|-----------|
| Free | 10 | 100 | 1,000 | 10,000 |
| Starter | 100 | 1,000 | 10,000 | 100,000 |
| Pro | 500 | 5,000 | 50,000 | 500,000 |
| Business | 1,000 | 10,000 | 100,000 | 1,000,000 |
| Enterprise | 10,000 | 100,000 | 1,000,000 | 10,000,000 |

## Database Schema

### Tables

#### `pricing_plans`
Stores all available pricing plans.

```sql
CREATE TABLE pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2),
  sms_limit INTEGER,
  email_limit INTEGER,
  data_limit_gb INTEGER,
  airtime_limit_ghs DECIMAL(10,2),
  api_rate_limit INTEGER DEFAULT 1000,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `subscriptions`
Tracks customer subscriptions to plans.

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES pricing_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  sms_used INTEGER DEFAULT 0,
  email_used INTEGER DEFAULT 0,
  data_used_gb DECIMAL(10,2) DEFAULT 0,
  airtime_used_ghs DECIMAL(10,2) DEFAULT 0,
  external_subscription_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id)
);
```

#### `invoices`
Stores all billing invoices.

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  invoice_number TEXT NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  due_date TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  billing_period_start TIMESTAMPTZ,
  billing_period_end TIMESTAMPTZ,
  items JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `payment_methods`
Stores customer payment methods.

```sql
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('card', 'mobile_money', 'bank_transfer')),
  provider TEXT,
  last_four TEXT NOT NULL,
  expiry_month INTEGER,
  expiry_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  external_payment_method_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

### GET `/api/v1/billing/plans`
Retrieve all available pricing plans.

**Response:**
```json
{
  "plans": [
    {
      "id": "uuid",
      "name": "Free Plan",
      "slug": "free",
      "description": "Perfect for getting started",
      "price_monthly": 0,
      "price_yearly": null,
      "sms_limit": 50,
      "email_limit": 500,
      "data_limit_gb": 1,
      "airtime_limit_ghs": 10,
      "api_rate_limit": 1000,
      "features": ["50 SMS/month", "500 emails/month", "Basic analytics"],
      "is_active": true,
      "is_popular": false
    }
  ]
}
```

### GET `/api/v1/billing/subscription`
Get the current customer's subscription details.

**Response:**
```json
{
  "id": "uuid",
  "plan": {
    "id": "uuid",
    "name": "Starter Plan",
    "slug": "starter",
    "price_monthly": 29,
    "sms_limit": 300,
    "email_limit": 2000,
    "data_limit_gb": 5,
    "airtime_limit_ghs": 30,
    "features": [...]
  },
  "status": "active",
  "current_period_start": "2024-12-01T00:00:00Z",
  "current_period_end": "2025-01-01T00:00:00Z",
  "usage": {
    "sms_used": 150,
    "email_used": 800,
    "data_used_gb": 2.5,
    "airtime_used_ghs": 15
  }
}
```

### GET `/api/v1/billing/invoices`
Retrieve customer invoices with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `status` (optional): Filter by status (paid, pending, overdue, cancelled)

**Response:**
```json
{
  "invoices": [
    {
      "id": "uuid",
      "invoice_number": "INV-2024-000001",
      "amount": 29.00,
      "currency": "USD",
      "status": "paid",
      "created_at": "2024-12-01T00:00:00Z",
      "due_date": "2024-12-15T00:00:00Z",
      "paid_at": "2024-12-05T10:30:00Z",
      "plan_name": "Starter Plan"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "total_pages": 3
  }
}
```

### GET `/api/v1/billing/payment-methods`
Retrieve customer payment methods.

**Response:**
```json
{
  "payment_methods": [
    {
      "id": "uuid",
      "type": "card",
      "provider": "visa",
      "last_four": "3627",
      "expiry_month": 2,
      "expiry_year": 2026,
      "is_default": true
    }
  ]
}
```

### POST `/api/v1/billing/payment-methods`
Add a new payment method.

**Request Body:**
```json
{
  "type": "card",
  "provider": "visa",
  "last_four": "1234",
  "expiry_month": 12,
  "expiry_year": 2027,
  "is_default": true
}
```

### DELETE `/api/v1/billing/payment-methods`
Remove a payment method.

**Request Body:**
```json
{
  "payment_method_id": "uuid"
}
```

## Rate Limiting Implementation

Rate limits are enforced via Redis and are defined in `lib/rate-limit/index.ts`.

### Service-Specific Limits

Each service (SMS, Email, Airtime, Data) has its own rate limits aligned with the plan's monthly quotas:

```typescript
export const SERVICE_LIMITS = {
  sms: {
    free: { perMinute: 5, perDay: 50, perMonth: 50 },
    starter: { perMinute: 50, perDay: 300, perMonth: 300 },
    pro: { perMinute: 200, perDay: 1500, perMonth: 1500 },
    business: { perMinute: 500, perDay: 6000, perMonth: 6000 },
    enterprise: { perMinute: 5000, perDay: 100000, perMonth: 1000000 }
  },
  email: {
    free: { perMinute: 10, perDay: 500, perMonth: 500 },
    starter: { perMinute: 100, perDay: 2000, perMonth: 2000 },
    pro: { perMinute: 500, perDay: 10000, perMonth: 10000 },
    business: { perMinute: 1000, perDay: 40000, perMonth: 40000 },
    enterprise: { perMinute: 10000, perDay: 500000, perMonth: 10000000 }
  }
  // ... airtime and data
};
```

### Plan Monthly Limits

For usage tracking and display:

```typescript
export const PLAN_MONTHLY_LIMITS = {
  free: { sms: 50, email: 500, dataGb: 1, airtimeGhs: 10 },
  starter: { sms: 300, email: 2000, dataGb: 5, airtimeGhs: 30 },
  pro: { sms: 1500, email: 10000, dataGb: 30, airtimeGhs: 150 },
  business: { sms: 6000, email: 40000, dataGb: 150, airtimeGhs: 600 },
  enterprise: { sms: Infinity, email: Infinity, dataGb: Infinity, airtimeGhs: Infinity }
};
```

## Database Migration

Run the migration to set up the billing system:

```bash
# Apply the migration
psql $DATABASE_URL -f migrations/010_billing_system.sql
```

Or via Supabase:
```bash
supabase migration up
```

## Usage Tracking

Usage is tracked in two places:
1. **Redis** - Real-time rate limiting counters
2. **Subscriptions table** - Monthly usage aggregates (`sms_used`, `email_used`, etc.)

### Incrementing Usage

Call `increment_subscription_usage()` function after each successful API call:

```sql
SELECT increment_subscription_usage(
  'customer-uuid',
  'sms',  -- usage_type: 'sms', 'email', 'data', 'airtime'
  1       -- amount
);
```

### Resetting Usage

Usage resets automatically at the start of each billing period. The `reset_subscription_usage()` function can be called by a cron job:

```sql
SELECT reset_subscription_usage('subscription-uuid');
```

## Dashboard Integration

The billing dashboard (`/dashboard/billing`) displays:

1. **Current Plan** - Shows plan name, price, and usage progress bar
2. **Payment Method** - Displays default payment method with change option
3. **Invoices Table** - Paginated list of all invoices with download links

Data is fetched from the billing APIs and updates in real-time.

## Future Enhancements

- [ ] Paystack integration for African payments
- [ ] Mobile Money support (MTN, Vodafone, AirtelTigo)
- [ ] Usage alerts and notifications
- [ ] Proration calculations

## Stripe Integration

### Overview

SendComms uses Stripe for payment processing with full webhook support for subscription lifecycle management.

### Configuration

Required environment variables:

```bash
STRIPE_SECRET_KEY=sk_live_xxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx
```

### Checkout Flow

1. User selects plan and billing cycle (monthly/yearly)
2. Frontend creates checkout session via `/api/dashboard/billing/checkout`
3. User completes payment on Stripe hosted checkout
4. Stripe webhook fires `checkout.session.completed`
5. Backend activates subscription and updates database

```typescript
// Create checkout session
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  customer_email: customer.email,
  line_items: [{
    price: priceId, // Stripe price ID
    quantity: 1,
  }],
  metadata: {
    customer_id: customerId,
    plan: planName,
    billing_cycle: 'monthly' | 'yearly',
  },
  success_url: `${baseUrl}/dashboard/billing?success=true`,
  cancel_url: `${baseUrl}/dashboard/billing/upgrade?cancelled=true`,
});
```

### Subscription Management

#### Cancel Subscription

```bash
POST /api/dashboard/billing/cancel
```

Cancels at end of billing period. User retains access until `current_period_end`.

#### Resubscribe

```bash
POST /api/dashboard/billing/checkout
```

Creates new subscription after cancellation.

---

## Webhook Events

### Webhook Endpoint

```
POST /api/webhooks/stripe
```

All Stripe events are processed here with signature verification.

### Supported Events

| Event | Handler | Description |
|-------|---------|-------------|
| `checkout.session.completed` | `handleCheckoutComplete` | Initial subscription created |
| `checkout.session.expired` | - | Checkout abandoned |
| `customer.subscription.created` | `handleSubscriptionCreated` | New subscription logged |
| `customer.subscription.updated` | `handleSubscriptionUpdate` | Plan changes, status updates |
| `customer.subscription.deleted` | `handleSubscriptionCancelled` | Subscription terminated |
| `customer.subscription.paused` | `handleSubscriptionPaused` | Subscription paused |
| `customer.subscription.resumed` | `handleSubscriptionResumed` | Subscription resumed |
| `customer.subscription.trial_will_end` | `handleTrialWillEnd` | Trial ending in 3 days |
| `invoice.created` | - | New invoice created |
| `invoice.finalized` | - | Invoice ready for payment |
| `invoice.paid` | `handleInvoicePaid` | **Monthly/yearly payment success** |
| `invoice.payment_failed` | `handleInvoiceFailed` | Payment attempt failed |
| `invoice.payment_action_required` | `handlePaymentActionRequired` | 3D Secure required |
| `invoice.upcoming` | `handleUpcomingInvoice` | Payment reminder (~3 days before) |
| `invoice.marked_uncollectible` | `handleInvoiceUncollectible` | All retries exhausted |
| `payment_intent.payment_failed` | `handlePaymentIntentFailed` | Payment intent failed |
| `payment_intent.requires_action` | - | Customer action needed |
| `charge.refunded` | `handleChargeRefunded` | Refund processed |
| `charge.dispute.created` | `handleDisputeCreated` | Chargeback initiated |

### Billing Cycle Renewals

When `invoice.paid` fires with `billing_reason: subscription_cycle`:

1. ✅ Usage counters reset to 0 (sms_used, email_used, etc.)
2. ✅ Billing period dates updated
3. ✅ Invoice record created in database
4. ✅ Email notification sent to customer

### Failed Payment Handling

Stripe retries failed payments automatically (typically 4 attempts over 3 weeks):

1. **Attempt 1 fails**: Status → `past_due`, email sent
2. **Attempt 2-4 fail**: Increment `failed_payment_count`, emails sent
3. **All attempts exhausted**: `invoice.marked_uncollectible` fires
4. **Subscription cancelled**: Downgrade to free plan, final email sent

### Billing Events Audit Trail

All events are logged to the `billing_events` table:

```sql
CREATE TABLE billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  event_type TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Email Notifications

### Email Templates

Located in `lib/email/templates/billing.tsx`:

| Template | Trigger | Purpose |
|----------|---------|---------|
| `PaymentSuccessEmail` | Invoice paid | Monthly/yearly payment confirmation |
| `PaymentFailedEmail` | Invoice failed | Payment failure with retry info |
| `SubscriptionCancelledEmail` | Subscription deleted | Cancellation confirmation |
| `UpcomingPaymentEmail` | Invoice upcoming | 3-day payment reminder |
| `TrialEndingEmail` | Trial will end | Trial ending in 3 days |
| `PaymentActionRequiredEmail` | Action required | 3D Secure authentication needed |

### Email Service

Emails are sent via Resend (`lib/email/billing-notifications.ts`):

```typescript
import { sendPaymentSuccessEmail } from '@/lib/email/billing-notifications';

await sendPaymentSuccessEmail({
  email: 'customer@example.com',
  name: 'John Doe',
  planName: 'Pro',
  amount: 99,
  currency: 'USD',
  invoiceNumber: 'INV-2024-001',
  periodStart: new Date(),
  periodEnd: new Date('2025-02-01'),
  invoiceUrl: 'https://invoice.stripe.com/xxx',
});
```

### Testing Emails

Test endpoint for manual email testing:

```bash
# Send all test emails
POST /api/test-billing-emails?type=all&email=test@example.com

# Send specific email type
POST /api/test-billing-emails?type=payment_success&email=test@example.com

# Types: payment_success, payment_failed, subscription_cancelled, 
#        upcoming_payment, trial_ending, action_required, all
```

---

## Dashboard UI Components

### Billing Page (`/dashboard/billing`)

- **Subscription Card**: Current plan, next/last payment dates, cancel button
- **Payment Status Alert**: Shows warnings for past_due, cancelled states
- **Plan Limits Progress**: Visual bars for SMS, Email, Data, Airtime usage
- **Invoices Table**: Paginated list with status badges and invoice links

### Upgrade Page (`/dashboard/billing/upgrade`)

- **Plan Cards**: All available plans with pricing (monthly/yearly toggle)
- **Current Plan Badge**: Highlights active subscription
- **Payment Tabs**: Card or Mobile Money selection
- **Order Summary**: Shows plan, billing cycle, and total

### Real-time Updates

Billing data uses Supabase real-time subscriptions for instant UI updates:

```typescript
const subscription = supabase
  .channel('subscription-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'subscriptions' },
    (payload) => fetchSubscription()
  )
  .subscribe();
```

---

## Security Considerations

1. **Webhook Signature Verification**: All Stripe webhooks verify `stripe-signature` header
2. **Service Role Access**: Webhooks use `SUPABASE_SERVICE_KEY` for database writes
3. **Customer ID Validation**: Metadata is verified before processing
4. **Idempotency**: Invoice records use `onConflict: 'stripe_invoice_id'` to prevent duplicates
5. **Rate Limiting**: API endpoints are rate-limited per customer
