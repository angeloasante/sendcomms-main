# SendComms API - Implementation Guide

> **A B2B Communications API Platform for Africa**  
> Reselling SMS, Email, Airtime, and Data services under one unified API

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Current Implementation Status](#current-implementation-status)
4. [Environment Setup](#environment-setup)
5. [Upstash Redis Setup](#upstash-redis-setup)
6. [Supabase Setup](#supabase-setup)
7. [Resend Setup](#resend-setup)
8. [API Usage](#api-usage)
9. [Creating API Keys for Customers](#creating-api-keys-for-customers)
10. [What's Left to Implement](#whats-left-to-implement)
11. [Revenue Model](#revenue-model)

---

## Overview

SendComms is a unified communications API that allows businesses to send:
- **Emails** via Resend
- **SMS** via Termii (planned)
- **Airtime** via Reloadly (planned)
- **Data Bundles** via Reloadly (planned)

### Business Model
We act as a **reseller** - purchasing services at wholesale prices and selling them with a markup to ensure profitability.

| Service | Our Cost | We Charge | Markup |
|---------|----------|-----------|--------|
| Email | $0.0004/email | $0.001/email | 150% |
| SMS | $0.005/SMS | $0.015/SMS | 200% |
| Airtime | Face value | Face value + 5% | 5% |
| Data | Face value | Face value + 8% | 8% |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SendComms Platform                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐               │
│  │ Next.js  │    │ Supabase │    │  Upstash │               │
│  │   API    │───▶│ Postgres │    │  Redis   │               │
│  │ Routes   │    │    DB    │    │  Cache   │               │
│  └────┬─────┘    └──────────┘    └──────────┘               │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────────────────────────────────┐                │
│  │           Provider Abstraction           │                │
│  ├──────────┬──────────┬──────────┬────────┤                │
│  │  Resend  │  Termii  │ Reloadly │ Future │                │
│  │  (Email) │  (SMS)   │(Airtime) │Providers│                │
│  └──────────┴──────────┴──────────┴────────┘                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| API Routes | Handle incoming requests | `app/api/v1/` |
| Rate Limiting | Prevent abuse, tiered by plan | `lib/rate-limit/` |
| Email Service | Send emails via Resend | `lib/email/resend.ts` |
| API Helpers | Validation, pricing, webhooks | `lib/api-helpers.ts` |
| Database | Store transactions, customers | Supabase (PostgreSQL) |
| Cache | Rate limiting, session data | Upstash Redis |

---

## Current Implementation Status

### ✅ Completed

- [x] **Project Structure** - Full Next.js 16 app with App Router
- [x] **Email Service (Resend)**
  - Single email sending (`/api/v1/email/send`)
  - Batch email sending (`/api/v1/email/batch`)
  - Webhook handling for delivery status
  - Email templates (Welcome, Transaction Receipt)
- [x] **Rate Limiting System**
  - Multi-tier rate limits (Free, Starter, Pro, Enterprise)
  - Per-service limits (email, SMS, airtime, data)
  - Redis-based sliding window
- [x] **API Key Validation**
  - Secure key generation
  - Key scoping by service
  - Usage tracking
- [x] **Pricing Engine**
  - Cost vs price calculation
  - Minimum charge enforcement
  - Balance checking
- [x] **Webhook System**
  - Signature verification
  - Customer webhook forwarding
  - Retry logic
- [x] **Database Schema** - Full Supabase schema ready

### 🔄 In Progress

- [ ] SMS via Termii
- [ ] Airtime via Reloadly
- [ ] Data Bundles via Reloadly
- [ ] Customer Dashboard (UI)
- [ ] Admin Dashboard

### 📋 Planned

- [ ] Invoice generation
- [ ] Auto top-up
- [ ] Multi-currency support
- [ ] Analytics dashboard
- [ ] SDKs (Node.js, Python, PHP)

---

## Environment Setup

Create a `.env.local` file in the project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Upstash Redis Configuration
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Termii Configuration (for SMS - coming soon)
TERMII_API_KEY=your-termii-key
TERMII_SENDER_ID=SendComms

# Reloadly Configuration (for Airtime/Data - coming soon)
RELOADLY_CLIENT_ID=your-client-id
RELOADLY_CLIENT_SECRET=your-client-secret

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Upstash Redis Setup

Upstash provides serverless Redis that works perfectly with Next.js and Vercel.

### Step 1: Create an Upstash Account

1. Go to [https://upstash.com](https://upstash.com)
2. Click **"Start for Free"** or **"Sign Up"**
3. Sign up with GitHub, Google, or email

### Step 2: Create a Redis Database

1. Once logged in, click **"Create Database"**
2. Configure your database:
   - **Name**: `sendcomms-prod` (or any name)
   - **Type**: Regional (cheaper) or Global (faster worldwide)
   - **Region**: Choose closest to your users (e.g., `eu-west-1` for Europe/Africa)
   - **TLS**: Keep enabled (recommended)
3. Click **"Create"**

### Step 3: Get Your Credentials

After creation, you'll see your database dashboard:

1. Click on your database name
2. Scroll down to **"REST API"** section
3. You'll see:
   - **UPSTASH_REDIS_REST_URL**: `https://xxxx.upstash.io`
   - **UPSTASH_REDIS_REST_TOKEN**: `AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ==`

4. Copy these values to your `.env.local`:

```bash
UPSTASH_REDIS_REST_URL=https://your-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=AYourTokenHerexxxxxxxxxxxxxxxxxxxxQ==
```

### Step 4: Verify Connection

Test your Redis connection by running:

```bash
curl -X POST "https://your-url.upstash.io/set/test/hello" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

You should get: `{"result":"OK"}`

### Upstash Pricing (as of 2024)

| Plan | Price | Requests | Data |
|------|-------|----------|------|
| Free | $0/mo | 10,000/day | 256MB |
| Pay-as-you-go | $0.2/100K requests | Unlimited | 1GB |
| Pro | $10/mo | 100K/day included | 10GB |

For starting out, the **Free tier** is more than enough!

---

## Supabase Setup

### Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up / Sign in
3. Click **"New Project"**
4. Fill in:
   - **Organization**: Create or select one
   - **Project Name**: `sendcomms`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click **"Create new project"**

### Step 2: Get Your API Keys

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_KEY` (keep this secret!)

### Step 3: Run the Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `database/schema.sql`
3. Paste and run it

This creates all necessary tables:
- `customers` - Your API customers
- `api_keys` - API keys for authentication
- `transactions` - All API transactions
- `usage_logs` - API usage tracking
- `webhook_logs` - Webhook delivery logs

### Step 4: Create Your First Customer (Admin)

Run this SQL in Supabase SQL Editor:

```sql
-- Create your admin customer account
INSERT INTO customers (id, email, company_name, plan, balance, is_active)
VALUES (
  gen_random_uuid(),
  'your-email@example.com',
  'SendComms Admin',
  'enterprise',
  1000.00,  -- Starting balance
  true
);

-- Get the customer ID
SELECT id FROM customers WHERE email = 'your-email@example.com';
```

Then create an API key:

```sql
-- Replace 'YOUR_CUSTOMER_ID' with the actual ID from above
INSERT INTO api_keys (id, customer_id, key_hash, name, scopes, is_active)
VALUES (
  gen_random_uuid(),
  'YOUR_CUSTOMER_ID',
  'ac_test_' || encode(gen_random_bytes(24), 'hex'),
  'Test API Key',
  ARRAY['email', 'sms', 'airtime', 'data'],
  true
);

-- Get your API key
SELECT key_hash FROM api_keys WHERE customer_id = 'YOUR_CUSTOMER_ID';
```

---

## Resend Setup

### Step 1: Create a Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Sign up with GitHub or email
3. Verify your email

### Step 2: Add and Verify a Domain

1. Go to **Domains** → **Add Domain**
2. Enter your domain (e.g., `sendcomms.com`)
3. Add the DNS records Resend provides:
   - SPF record
   - DKIM records
   - Optional: DMARC record
4. Wait for verification (usually 5-30 minutes)

**For Testing**: You can use Resend's test domain initially - emails will only work to your verified email address.

### Step 3: Get Your API Key

1. Go to **API Keys** → **Create API Key**
2. Name it (e.g., `sendcomms-production`)
3. Set permissions: **Full access** or **Sending access**
4. Copy the key (starts with `re_`)

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
```

### Step 4: Set Up Webhooks (Optional but Recommended)

1. Go to **Webhooks** → **Add Webhook**
2. Enter your endpoint URL: `https://yourdomain.com/api/webhooks/resend`
3. Select events:
   - `email.sent`
   - `email.delivered`
   - `email.bounced`
   - `email.complained`
   - `email.opened`
   - `email.clicked`
4. Copy the **Signing Secret**:

```bash
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
```

### Resend Pricing

| Plan | Price | Emails/month |
|------|-------|--------------|
| Free | $0 | 100/day, 3,000/month |
| Pro | $20/mo | 50,000 included |
| Scale | Custom | Millions |

---

## API Usage

### Authentication

All API requests require an API key in the `Authorization` header:

```bash
Authorization: Bearer ac_test_xxxxxxxxxxxxxxxxxxxx
```

Or as `X-API-Key`:

```bash
X-API-Key: ac_test_xxxxxxxxxxxxxxxxxxxx
```

### Send a Single Email

```bash
curl -X POST https://your-domain.com/api/v1/email/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Hello from SendComms",
    "html": "<h1>Welcome!</h1><p>This is a test email.</p>",
    "from": "Your Name <hello@yourdomain.com>"
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "tx_email_abc123",
    "email_id": "re_xxxxx",
    "status": "sent",
    "recipients": 1,
    "cost": 0.001,
    "currency": "USD"
  }
}
```

### Send Batch Emails

```bash
curl -X POST https://your-domain.com/api/v1/email/batch \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "emails": [
      {
        "to": "user1@example.com",
        "subject": "Welcome!",
        "html": "<p>Hello User 1</p>"
      },
      {
        "to": "user2@example.com",
        "subject": "Welcome!",
        "html": "<p>Hello User 2</p>"
      }
    ]
  }'
```

### Check Usage

```bash
curl https://your-domain.com/api/v1/usage \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## Creating API Keys for Customers

### Option 1: Direct Database Insert

```sql
-- First, create the customer
INSERT INTO customers (id, email, company_name, plan, balance, is_active)
VALUES (
  gen_random_uuid(),
  'customer@example.com',
  'Customer Company',
  'starter',  -- free, starter, pro, enterprise
  50.00,      -- initial balance
  true
)
RETURNING id;

-- Then create their API key
INSERT INTO api_keys (id, customer_id, key_hash, name, scopes, is_active)
VALUES (
  gen_random_uuid(),
  'CUSTOMER_ID_FROM_ABOVE',
  'ac_live_' || encode(gen_random_bytes(24), 'hex'),
  'Production Key',
  ARRAY['email'],  -- limit to specific services
  true
)
RETURNING key_hash;
```

### Option 2: Admin API (To Be Implemented)

```bash
# Future admin endpoint
curl -X POST https://your-domain.com/api/admin/customers \
  -H "Authorization: Bearer ADMIN_SECRET" \
  -d '{
    "email": "customer@example.com",
    "company_name": "Customer Company",
    "plan": "starter",
    "initial_balance": 50.00
  }'
```

---

## What's Left to Implement

### High Priority 🔴

1. **SMS Service (Termii)**
   - Create `lib/sms/termii.ts` SDK wrapper
   - Implement `/api/v1/sms/send` route
   - Add Termii webhook handler
   - Test with Nigerian numbers

2. **Airtime Service (Reloadly)**
   - Create `lib/airtime/reloadly.ts` SDK wrapper
   - Implement `/api/v1/airtime/purchase` route
   - Get operator list for Africa
   - Handle async fulfillment

3. **Data Bundle Service (Reloadly)**
   - Similar to airtime implementation
   - `/api/v1/data/purchase` route

4. **Customer Onboarding**
   - Sign-up flow
   - Email verification
   - API key generation UI
   - Balance top-up (Stripe/Paystack)

### Medium Priority 🟡

5. **Admin Dashboard**
   - View all customers
   - View all transactions
   - Manual balance adjustments
   - Usage analytics

6. **Customer Dashboard**
   - Transaction history
   - Usage graphs
   - API key management
   - Webhook configuration

7. **Billing System**
   - Stripe integration for payments
   - Paystack integration (for Africa)
   - Auto-top-up when balance low
   - Invoice generation

### Low Priority 🟢

8. **Developer Experience**
   - SDK libraries (Node.js, Python, PHP)
   - Postman collection
   - API playground
   - Better documentation

9. **Advanced Features**
   - Email templates library
   - Scheduled sending
   - Contact lists
   - Analytics (open rates, click rates)

---

## Revenue Model

### Cost Structure

| Service | Provider | Our Cost | We Charge | Profit/Unit |
|---------|----------|----------|-----------|-------------|
| Email | Resend | $0.0004 | $0.001 | $0.0006 |
| SMS (Nigeria) | Termii | $0.005 | $0.015 | $0.010 |
| SMS (Kenya) | Termii | $0.008 | $0.020 | $0.012 |
| Airtime | Reloadly | Face value | +5% | 5% |
| Data | Reloadly | Face value | +8% | 8% |

### Example Monthly Revenue

| Scenario | Emails | SMS | Revenue |
|----------|--------|-----|---------|
| Small | 10,000 | 1,000 | $25 |
| Medium | 100,000 | 10,000 | $260 |
| Large | 1,000,000 | 100,000 | $2,600 |

### Plan Limits

| Plan | Price | Emails/mo | SMS/mo | Rate Limit |
|------|-------|-----------|--------|------------|
| Free | $0 | 1,000 | 100 | 10/min |
| Starter | $29 | 50,000 | 5,000 | 60/min |
| Pro | $99 | 250,000 | 25,000 | 300/min |
| Enterprise | Custom | Unlimited | Unlimited | 1000/min |

---

## Testing Checklist

- [ ] Redis connection works
- [ ] Supabase connection works
- [ ] Can create customer in database
- [ ] Can generate API key
- [ ] Email sending works
- [ ] Webhooks are received
- [ ] Rate limiting works
- [ ] Balance deduction works

---

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repo to Vercel
3. Add environment variables
4. Deploy!

### Environment Variables in Vercel

Add all variables from `.env.local` to Vercel:
- Settings → Environment Variables → Add each one

---

## Support

For issues or questions:
- GitHub Issues: [your-repo/issues]
- Email: support@sendcomms.com

---

*Last updated: December 21, 2025*
