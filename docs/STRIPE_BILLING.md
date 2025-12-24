# SendComms Stripe Billing Integration

This document provides a comprehensive guide to the Stripe billing integration for SendComms, including setup, configuration, pricing plans, and the complete upgrade flow.

## Table of Contents

1. [Overview](#overview)
2. [Environment Configuration](#environment-configuration)
3. [Pricing Plans](#pricing-plans)
4. [Architecture](#architecture)
5. [API Endpoints](#api-endpoints)
6. [Upgrade Flow](#upgrade-flow)
7. [Webhook Handling](#webhook-handling)
8. [Database Schema](#database-schema)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## Overview

SendComms uses Stripe for subscription billing with the following features:

- **Dynamic pricing** - Plans are stored in the database and can be updated without code changes
- **Monthly & Annual billing** - Users can choose billing cycle with ~20% savings on annual
- **Stripe Checkout** - Secure, hosted payment page
- **Webhook integration** - Automatic subscription lifecycle management
- **Real-time dashboard** - Live usage tracking with Supabase Realtime

---

## Environment Configuration

Add these variables to your `.env.local` file:

```bash
# ===================
# STRIPE (Payments)
# ===================
# Get your Stripe keys from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_xxxxx           # Required: Stripe secret key
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx      # Optional: For client-side Stripe.js
STRIPE_WEBHOOK_SECRET=whsec_xxxxx         # Required: From Stripe webhook endpoint

# Checkout redirect URLs
STRIPE_SUCCESS_URL=http://localhost:3000/dashboard/billing?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=http://localhost:3000/dashboard/billing

# Optional: Pre-configured Stripe Price IDs (recommended for production)
# If not set, dynamic prices will be created automatically
STRIPE_PRICE_STARTER_MONTHLY=price_xxxxx
STRIPE_PRICE_STARTER_YEARLY=price_xxxxx
STRIPE_PRICE_PRO_MONTHLY=price_xxxxx
STRIPE_PRICE_PRO_YEARLY=price_xxxxx
STRIPE_PRICE_BUSINESS_MONTHLY=price_xxxxx
STRIPE_PRICE_BUSINESS_YEARLY=price_xxxxx
```

### Getting Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy your **Secret key** (starts with `sk_test_` for test mode)
3. For webhooks, create an endpoint at **Developers > Webhooks**

---

## Pricing Plans

SendComms offers 5 pricing tiers. Pricing is consistent across:
- Landing page (`sendcomms-landing/app/pricing/page.tsx`)
- Database (`migrations/010_billing_system.sql`)
- Checkout API (`app/api/v1/billing/checkout/route.ts`)

### Plan Comparison

| Feature | Free | Starter | Pro | Business | Enterprise |
|---------|------|---------|-----|----------|------------|
| **Monthly Price** | $0 | $29 | $99 | $299 | Custom |
| **Annual Price** | $0 | $279 | $950 | $2,870 | Custom |
| **SMS/month** | 50 | 300 | 1,500 | 6,000 | Custom |
| **Emails/month** | 500 | 2,000 | 10,000 | 40,000 | Custom |
| **Data** | 1GB | 5GB | 30GB | 150GB | Custom |
| **Airtime (GHS)** | 10 | 30 | 150 | 600 | Custom |
| **Support** | Community | Email | Priority | Phone | Dedicated |
| **Branding** | SendComms | Remove ✓ | Remove ✓ | Remove ✓ | Remove ✓ |
| **Webhooks** | ✗ | ✗ | ✓ | ✓ | ✓ |
| **Slack Channel** | ✗ | ✗ | ✓ | ✓ | ✓ |
| **Account Manager** | ✗ | ✗ | ✗ | ✓ | ✓ |
| **Uptime SLA** | - | 99.9% | 99.9% | Custom | 99.99% |

### Annual Savings

| Plan | Monthly x 12 | Annual Price | Savings |
|------|--------------|--------------|---------|
| Starter | $348 | $279 | ~20% |
| Pro | $1,188 | $950 | ~20% |
| Business | $3,588 | $2,870 | ~20% |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Dashboard                            │
│                  /dashboard/billing/upgrade                      │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    POST /api/v1/billing/checkout                 │
│  • Validates user session                                        │
│  • Creates/retrieves Stripe customer                            │
│  • Creates dynamic price (if needed)                            │
│  • Creates Stripe Checkout Session                              │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Stripe Checkout Page                         │
│  • Hosted by Stripe (PCI compliant)                             │
│  • User enters payment details                                   │
│  • Redirects to success/cancel URL                              │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               POST /api/webhooks/stripe                          │
│  • Verifies webhook signature                                    │
│  • Handles checkout.session.completed                           │
│  • Updates subscription in database                             │
│  • Triggers real-time dashboard update                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### GET /api/v1/billing/plans

Returns all available pricing plans.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "starter",
      "displayName": "Starter Plan",
      "description": "Ideal for startups launching their services.",
      "pricing": {
        "monthly": 29,
        "yearly": 279,
        "currency": "USD"
      },
      "limits": {
        "sms": 300,
        "emails": 2000,
        "dataGb": 5,
        "airtimeGhs": 30
      },
      "features": {
        "support": "email",
        "remove_branding": true,
        "uptime_sla": "99.9%"
      }
    }
  ]
}
```

### POST /api/v1/billing/checkout

Creates a Stripe Checkout session for subscription.

**Request:**
```json
{
  "plan": "starter",           // starter, pro, or business
  "billing_cycle": "monthly"   // monthly or yearly
}
```

**Response (Success):**
```json
{
  "success": true,
  "url": "https://checkout.stripe.com/pay/cs_xxxxx",
  "session_id": "cs_xxxxx"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Please log in to upgrade"
  }
}
```

### GET /api/v1/dashboard/billing

Returns current subscription and usage data.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "subscription-uuid",
    "plan": {
      "name": "starter",
      "displayName": "Starter Plan",
      "limits": { "sms": 300, "emails": 2000 }
    },
    "usage": {
      "sms": 45,
      "emails": 120,
      "dataMb": 500
    },
    "remaining": {
      "sms": 255,
      "emails": 1880
    },
    "status": "active",
    "billingCycle": "monthly",
    "currentPeriodEnd": "2025-01-24T00:00:00Z"
  }
}
```

---

## Upgrade Flow

### User Journey

1. User clicks **Upgrade** button on `/dashboard/billing`
2. Redirected to `/dashboard/billing/upgrade`
3. User selects:
   - Plan tier (Starter, Pro, Business)
   - Billing cycle (Monthly/Annual)
4. User clicks **Subscribe**
5. Frontend calls `POST /api/v1/billing/checkout`
6. User is redirected to Stripe Checkout
7. After payment:
   - Success → Redirect to `/dashboard/billing?session_id=xxx`
   - Cancel → Redirect to `/dashboard/billing/upgrade`
8. Stripe sends webhook to `/api/webhooks/stripe`
9. Database updates with new subscription
10. Dashboard shows updated plan via real-time

### Upgrade Page Features

- **Dynamic plan loading** - Fetches plans from API
- **Live price calculation** - Shows monthly equivalent for annual
- **Savings display** - Shows ~20% savings for annual plans
- **Feature comparison** - Lists all plan features
- **Responsive design** - Works on mobile and desktop

---

## Webhook Handling

### Supported Events

Configure these events in your Stripe webhook endpoint:

| Event | Handler | Description |
|-------|---------|-------------|
| `checkout.session.completed` | `handleCheckoutComplete` | New subscription created |
| `customer.subscription.created` | `handleSubscriptionUpdate` | Subscription activated |
| `customer.subscription.updated` | `handleSubscriptionUpdate` | Plan changed or renewed |
| `customer.subscription.deleted` | `handleSubscriptionCancelled` | Subscription cancelled |
| `invoice.paid` | `handleInvoicePaid` | Payment successful |
| `invoice.payment_failed` | `handleInvoiceFailed` | Payment failed |

### Webhook URL

```
Production: https://yourdomain.com/api/webhooks/stripe
Development: Use ngrok or similar for testing
```

### Webhook Security

Webhooks are verified using the `STRIPE_WEBHOOK_SECRET`:

```typescript
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

---

## Database Schema

### Required Tables

Run `migrations/011_stripe_integration.sql` to add:

```sql
-- Add Stripe customer ID to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE;

-- Add Stripe subscription ID to subscriptions table  
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

-- Add Stripe invoice ID to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS stripe_invoice_id VARCHAR(255);
```

### Subscription Lifecycle

```
┌──────────────┐    ┌──────────┐    ┌───────────┐    ┌───────────┐
│   created    │ -> │  active  │ -> │ past_due  │ -> │ cancelled │
└──────────────┘    └──────────┘    └───────────┘    └───────────┘
       │                 │                │
       │                 └──── renew ─────┘
       │                        │
       └──────── trial ─────────┘
```

---

## Testing

### Test Mode

1. Use test API keys (`sk_test_...`, `pk_test_...`)
2. Use Stripe test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - 3D Secure: `4000 0025 0000 3155`

### Test the Flow

```bash
# 1. Check plans API
curl http://localhost:3000/api/v1/billing/plans | jq

# 2. Test checkout (requires auth cookie)
curl -X POST http://localhost:3000/api/v1/billing/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=xxx" \
  -d '{"plan":"starter","billing_cycle":"monthly"}'

# 3. Test webhook (use Stripe CLI)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed
```

### Webhook Testing with Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy webhook signing secret to .env.local
# Output: whsec_xxxxx

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.paid
```

---

## Troubleshooting

### Common Issues

#### 1. "Please log in to upgrade"
**Cause:** User session not authenticated  
**Solution:** Ensure user is logged in before accessing upgrade page

#### 2. "Customer record not found"
**Cause:** No customer record linked to auth user  
**Solution:** Check `auth_user_id` column in customers table

#### 3. Webhook signature verification failed
**Cause:** Incorrect `STRIPE_WEBHOOK_SECRET`  
**Solution:** Get the correct secret from Stripe Dashboard > Webhooks

#### 4. Dynamic prices created on every checkout
**Cause:** `STRIPE_PRICE_*` env vars not set  
**Solution:** Create products/prices in Stripe Dashboard and add Price IDs to env

#### 5. Dashboard not updating after payment
**Cause:** Webhook not reaching server or Realtime not enabled  
**Solution:** 
1. Check webhook logs in Stripe Dashboard
2. Enable Realtime on `subscriptions` table:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
   ```

### Debug Logging

Add these to see what's happening:

```typescript
// In checkout route
console.log('Creating checkout for:', { plan, billing_cycle, customer_id });

// In webhook handler
console.log('Webhook received:', event.type, event.data.object);
```

### Support

For billing issues:
- Check Stripe Dashboard for payment details
- Review webhook event logs
- Check `invoices` table for payment history

---

## Files Reference

| File | Purpose |
|------|---------|
| `app/dashboard/billing/upgrade/page.tsx` | Upgrade page UI |
| `app/api/v1/billing/checkout/route.ts` | Stripe Checkout API |
| `app/api/v1/billing/plans/route.ts` | Pricing plans API |
| `app/api/v1/dashboard/billing/route.ts` | Dashboard billing data |
| `app/api/webhooks/stripe/route.ts` | Stripe webhook handler |
| `migrations/010_billing_system.sql` | Billing tables & pricing data |
| `migrations/011_stripe_integration.sql` | Stripe columns |

---

## Production Checklist

- [ ] Switch to live Stripe keys (`sk_live_...`)
- [ ] Create products/prices in Stripe Dashboard (Production)
- [ ] Set `STRIPE_PRICE_*` env vars for all plans
- [ ] Configure webhook endpoint for production URL
- [ ] Update `STRIPE_SUCCESS_URL` and `STRIPE_CANCEL_URL`
- [ ] Enable Realtime on `subscriptions` table
- [ ] Test full upgrade flow with live card
- [ ] Set up Stripe Tax (if applicable)
- [ ] Configure dunning for failed payments
- [ ] Set up email notifications for subscription events
