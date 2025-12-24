# SendComms

<p align="center">
  <img src="public/logo.png" alt="SendComms Logo" width="120" height="120" />
</p>

<p align="center">
  <strong>A unified communications API platform for Africa</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-active-success" alt="Status" />
  <img src="https://img.shields.io/badge/Email%20API-✓%20Live-brightgreen" alt="Email API" />
  <img src="https://img.shields.io/badge/SMS%20API-✓%20Live-brightgreen" alt="SMS API" />
  <img src="https://img.shields.io/badge/Data%20API-✓%20Live-brightgreen" alt="Data API" />
  <img src="https://img.shields.io/badge/Billing%20API-✓%20Live-brightgreen" alt="Billing API" />
  <img src="https://img.shields.io/badge/Stripe%20Payments-✓%20Integrated-blueviolet" alt="Stripe Payments" />
  <img src="https://img.shields.io/badge/Sandbox%20Mode-✓%20Available-blue" alt="Sandbox Mode" />
  <img src="https://img.shields.io/badge/Airtime%20API-Coming%20Soon-yellow" alt="Airtime API" />
</p>

<p align="center">
  <a href="https://docs.sendcomms.com">Documentation</a> •
  <a href="https://console.sendcomms.com">Dashboard</a> •
  <a href="https://sendcomms.com/pricing">Pricing</a>
</p>

---

## Overview

SendComms is a B2B API platform that enables developers and businesses to integrate multiple communication services across Africa through a single, unified API. Instead of integrating separately with SMS providers, email services, and mobile top-up platforms, businesses can use SendComms as a single integration point.

## 🌐 Endpoints

| Environment | Base URL |
|-------------|----------|
| **API** | `https://api.sendcomms.com` |
| **Dashboard** | `https://console.sendcomms.com` |
| **Documentation** | `https://docs.sendcomms.com` |

---

## 🚀 Quick Start

### 1. Get Your API Key

1. Sign up at [console.sendcomms.com](https://console.sendcomms.com/signup)
2. Navigate to **Dashboard → API Keys**
3. Click **Create New Key**
4. Copy your key (shown once!)

### 2. Make Your First API Call

```bash
curl -X POST https://api.sendcomms.com/api/v1/email/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Hello from SendComms!",
    "html": "<h1>Welcome!</h1><p>Your email content here.</p>"
  }'
```

---

## 📧 Email API

Send transactional and marketing emails with high deliverability.

### Send Single Email

```javascript
// Using fetch
const response = await fetch('https://api.sendcomms.com/api/v1/email/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Welcome to our platform!',
    html: '<h1>Welcome!</h1><p>Thanks for signing up.</p>',
    from: 'Your App <hello@yourdomain.com>'
  })
});

const data = await response.json();
console.log(data);
```

```python
# Using Python requests
import requests

response = requests.post(
    'https://api.sendcomms.com/api/v1/email/send',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'to': 'user@example.com',
        'subject': 'Welcome to our platform!',
        'html': '<h1>Welcome!</h1><p>Thanks for signing up.</p>'
    }
)

print(response.json())
```

### Send Batch Emails

```bash
curl -X POST https://api.sendcomms.com/api/v1/email/batch \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "emails": [
      {
        "to": "user1@example.com",
        "subject": "Hello {{name}}",
        "html": "<p>Hi {{name}}, your order #{{order_id}} is ready!</p>",
        "variables": {"name": "John", "order_id": "12345"}
      },
      {
        "to": "user2@example.com",
        "subject": "Hello {{name}}",
        "html": "<p>Hi {{name}}, your order #{{order_id}} is ready!</p>",
        "variables": {"name": "Jane", "order_id": "12346"}
      }
    ]
  }'
```

---

## 📶 Data Bundles API

Purchase mobile data bundles for customers across Africa.

### Purchase Data Bundle

```bash
curl -X POST https://api.sendcomms.com/api/v1/data/purchase \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+233241234567",
    "operator": "mtn_gh",
    "package_id": "data_1gb_30days",
    "reference": "order_12345"
  }'
```

### Get Available Operators

```bash
curl https://api.sendcomms.com/api/v1/data/operators \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Get Data Packages

```bash
curl https://api.sendcomms.com/api/v1/data/packages?operator=mtn_gh \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## 📱 SMS API

Send SMS messages to 180+ countries with intelligent provider routing.

### Send SMS

```bash
curl -X POST https://api.sendcomms.com/api/v1/sms/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+233540800994",
    "message": "Hello from SendComms!",
    "sender_id": "SendComms"
  }'
```

### Send SMS (JavaScript)

```javascript
const response = await fetch('https://api.sendcomms.com/api/v1/sms/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: '+233540800994',
    message: 'Your OTP is 123456',
    sender_id: 'MyApp'
  })
});

const data = await response.json();
console.log(data);
```

### Get SMS Logs

```bash
curl "https://api.sendcomms.com/api/v1/sms/logs?limit=50&status=delivered" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Get SMS Stats

```bash
curl https://api.sendcomms.com/api/v1/sms/stats \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Get SMS Pricing

```bash
curl "https://api.sendcomms.com/api/v1/sms/pricing?country=GH" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### SMS Features

- **Multi-Provider Routing**: Automatic routing through Twilio or Termii based on destination
- **180+ Countries**: Global coverage with optimized African routes
- **Delivery Tracking**: Real-time status updates via webhooks
- **Sender ID**: Custom sender IDs (where supported)
- **Unicode Support**: Full support for special characters and emojis

---

## 🔑 Authentication

All API requests require authentication using Bearer tokens:

```bash
Authorization: Bearer YOUR_API_KEY
```

### API Key Format

| Prefix | Environment | Usage |
|--------|-------------|-------|
| `sc_live_` | Production | Real transactions |
| `sc_test_` | Sandbox | Testing (no charges) |

### Security Best Practices

- ✅ Store keys in environment variables
- ✅ Never expose keys in client-side code
- ✅ Rotate keys periodically
- ✅ Use test keys during development

### Security Verification

SendComms includes a security test suite (`/api/test-security`) that verifies:

| Test | Description |
|------|-------------|
| **Webhook Signatures** | Stripe webhooks reject invalid/missing signatures |
| **Rate Limiting** | API enforces rate limits with proper headers |
| **Sandbox Isolation** | Test keys isolated from live environment |
| **API Key Scoping** | Keys restricted to their customer's data |

Run security tests:
```bash
curl -X POST "https://api.sendcomms.com/api/test-security?test=all" | jq .
```

---

## 🧪 Sandbox Mode

Test your integration without making real transactions or incurring charges.

### How It Works

- Use API keys with `sc_test_` prefix
- All requests return realistic mock responses
- No actual SMS sent, emails delivered, or data purchased
- Perfect for development and testing

### Sandbox Response Example

```json
{
  "success": true,
  "sandbox": true,
  "data": {
    "message_id": "sandbox_msg_abc123",
    "status": "sent",
    "to": "+233540800994",
    "message": "Test message"
  },
  "note": "This is a sandbox transaction. No actual SMS was sent."
}
```

### Test Phone Numbers

| Number | Simulated Behavior |
|--------|-------------------|
| `+233000000001` | Always succeeds |
| `+233000000002` | Always fails |
| `+233000000003` | Delayed delivery |

---

## 📊 Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "transaction_id": "txn_abc123",
    "status": "sent",
    "price": {
      "amount": 0.001,
      "currency": "USD"
    }
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The 'to' field is required"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `MISSING_FIELD` | 400 | Required field not provided |
| `INVALID_REQUEST` | 400 | Request body malformed |
| `INVALID_PHONE_NUMBER` | 400 | Phone number format invalid |
| `UNSUPPORTED_COUNTRY` | 400 | Country not supported |
| `INSUFFICIENT_BALANCE` | 402 | Account balance too low |
| `RATE_LIMITED` | 429 | Too many requests |
| `PROVIDER_ERROR` | 502 | Upstream provider error |
| `INTERNAL_ERROR` | 500 | Server error |

### Provider Error Handling

SendComms automatically handles provider failures with:

- **Automatic Retries**: Failed requests are retried up to 3 times
- **Provider Failover**: If one provider fails, traffic is routed to alternatives
- **Error Escalation**: Critical errors trigger alerts to our team
- **Detailed Logging**: All errors are logged with full context

---

## 🪝 Webhooks

Receive real-time updates for your transactions.

### Register a Webhook

```bash
curl -X POST https://api.sendcomms.com/api/v1/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhooks",
    "events": ["email.sent", "email.delivered", "email.bounced"]
  }'
```

### Available Events

**Email Events**
- `email.sent` - Email accepted by mail server
- `email.delivered` - Email delivered to inbox
- `email.bounced` - Email bounced
- `email.complained` - Marked as spam
- `email.opened` - Email opened
- `email.clicked` - Link clicked

**Data Events**
- `data.success` - Data bundle activated
- `data.failed` - Data bundle failed

**SMS Events**
- `sms.sent` - SMS accepted by provider
- `sms.delivered` - SMS delivered to recipient
- `sms.failed` - SMS delivery failed
- `sms.rejected` - SMS rejected by carrier

### Verify Webhook Signature

```javascript
const crypto = require('crypto');

const signature = req.headers['x-sendcomms-signature'];
const expectedSignature = 'sha256=' + crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');

if (signature === expectedSignature) {
  // Webhook is authentic
}
```

---

## 💰 Pricing

### Email

| Volume | Price per Email |
|--------|-----------------|
| 0 - 10,000 | $0.00053 |
| 10,001 - 100,000 | $0.00045 |
| 100,001+ | Custom |

### Subscription Plans

| Plan | Monthly | SMS/mo | Emails/mo | Data | Airtime (GHS) |
|------|---------|--------|-----------|------|---------------|
| **Free** | $0 | 50 | 500 | 1GB | 10 |
| **Starter** | $29 | 300 | 2,000 | 5GB | 30 |
| **Pro** | $99 | 1,500 | 10,000 | 30GB | 150 |
| **Business** | $299 | 6,000 | 40,000 | 150GB | 600 |
| **Enterprise** | Custom | Unlimited | Unlimited | Unlimited | Custom |

### Data Bundles

Prices vary by operator and package. Check the dashboard for current rates.

### Rate Limits

| Plan | Per Minute | Per Hour | Per Day | Per Month |
|------|------------|----------|---------|-----------|
| Free | 10 | 100 | 1,000 | 10,000 |
| Starter | 100 | 1,000 | 10,000 | 100,000 |
| Pro | 500 | 5,000 | 50,000 | 500,000 |
| Business | 1,000 | 10,000 | 100,000 | 1,000,000 |
| Enterprise | 10,000 | 100,000 | 1,000,000 | 10,000,000 |

---

## 💳 Billing & Payments

SendComms uses Stripe for secure subscription billing with the following features:

### Billing Features

- **Stripe Integration**: Secure, PCI-compliant payment processing
- **Multiple Plans**: Free, Starter, Pro, Business, and Enterprise tiers
- **Monthly & Annual Billing**: ~20% savings on annual subscriptions
- **Real-time Usage Tracking**: Live usage updates via Supabase Realtime
- **Automated Invoicing**: PDF invoices generated automatically
- **Billing Notifications**: Email alerts for payments, failures, and renewals

### Billing API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/billing/plans` | GET | List all available pricing plans |
| `/v1/billing/subscription` | GET | Get current subscription details |
| `/v1/billing/checkout` | POST | Create Stripe Checkout session |
| `/v1/billing/invoices` | GET | List customer invoices |
| `/v1/billing/payment-methods` | GET | List saved payment methods |
| `/v1/dashboard/billing` | GET | Get billing dashboard data |

### Upgrade Flow

```
User Dashboard → Select Plan → Stripe Checkout → Webhook → Subscription Active
```

1. User visits `/dashboard/billing/upgrade`
2. Selects plan and billing cycle (monthly/annual)
3. Redirected to Stripe Checkout
4. After payment, webhook updates subscription
5. Dashboard reflects new plan in real-time

### Billing Webhooks (Stripe)

The platform handles these Stripe webhook events:

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create/update subscription |
| `customer.subscription.updated` | Sync subscription changes |
| `customer.subscription.deleted` | Handle cancellation |
| `invoice.paid` | Send payment success email |
| `invoice.payment_failed` | Send failure notification |
| `customer.subscription.trial_will_end` | Send trial ending reminder |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Applications                     │
│              (Mobile Apps, Web Apps, Backend Services)       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 api.sendcomms.com                           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐   │
│  │  Email  │ │   SMS   │ │ Airtime │ │  Data Bundles   │   │
│  │  /v1/   │ │  /v1/   │ │  /v1/   │ │     /v1/        │   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────────┬────────┘   │
└───────┼───────────┼───────────┼────────────────┼────────────┘
        │           │           │                │
        ▼           ▼           └────────┬───────┘
   ┌─────────┐ ┌─────────────┐          ▼
   │  Resend │ │SMS Providers│    ┌──────────┐
   │ (Email) │ │             │    │ Reloadly │
   └─────────┘ │  ┌───────┐  │    └──────────┘
               │  │Twilio │  │
               │  └───────┘  │
               │  ┌───────┐  │
               │  │Termii │  │
               │  └───────┘  │
               └─────────────┘
```

---

## 📚 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/email/send` | POST | Send single email |
| `/v1/email/batch` | POST | Send batch emails (up to 100) |
| `/v1/sms/send` | POST | Send SMS message |
| `/v1/sms/logs` | GET | Get SMS message logs |
| `/v1/sms/stats` | GET | Get SMS usage statistics |
| `/v1/sms/pricing` | GET | Get SMS pricing by country |
| `/v1/data/purchase` | POST | Purchase data bundle |
| `/v1/data/operators` | GET | List available operators |
| `/v1/data/packages` | GET | List data packages |
| `/v1/billing/plans` | GET | List pricing plans |
| `/v1/billing/subscription` | GET | Get subscription details |
| `/v1/billing/checkout` | POST | Create checkout session |
| `/v1/billing/invoices` | GET | List customer invoices |
| `/v1/billing/payment-methods` | GET | List payment methods |
| `/v1/dashboard/billing` | GET | Get billing dashboard data |
| `/v1/webhooks` | POST | Register webhook |
| `/v1/webhooks` | GET | List webhooks |
| `/v1/webhooks` | DELETE | Delete webhook |
| `/v1/keys` | GET | List API keys |
| `/v1/keys` | POST | Create API key |
| `/v1/usage` | GET | Get usage statistics |

---

## 🎯 Use Cases

- **Fintech** - Send OTPs, transaction alerts, reward customers with data
- **E-commerce** - Order confirmations, shipping updates, promotions
- **SaaS** - User notifications, password resets, onboarding
- **Loyalty Programs** - Reward customers with data bundles
- **HR/Payroll** - Send payslips, distribute data allowances

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Caching**: Upstash Redis
- **Auth**: Supabase Auth
- **Payments**: Stripe (subscriptions & billing)
- **Email**: Resend (transactional & billing emails)
- **SMS**: Twilio + Termii (multi-provider routing)
- **Styling**: Tailwind CSS
- **Real-time**: Supabase Realtime (live usage updates)

---

## 🔧 Self-Hosting

### Prerequisites

- Node.js 18+
- Supabase account
- Upstash Redis account
- Brevo account (for email)

### Installation

```bash
# Clone the repository
git clone https://github.com/angeloasante/sendcomms-main.git
cd sendcomms-main

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `RESEND_API_KEY` | Resend API key (email) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `RELOADLY_CLIENT_ID` | Reloadly client ID |
| `RELOADLY_CLIENT_SECRET` | Reloadly client secret |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio phone number |
| `TERMII_API_KEY` | Termii API key |
| `TERMII_SENDER_ID` | Termii sender ID |

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add environment variables in Vercel Dashboard → Settings → Environment Variables.

---

## 📁 Project Structure

```
sendcomms/
├── app/
│   ├── api/v1/              # API endpoints
│   │   ├── email/           # Email endpoints
│   │   ├── sms/             # SMS endpoints
│   │   │   ├── send/        # Send SMS
│   │   │   ├── logs/        # SMS logs
│   │   │   ├── stats/       # SMS statistics
│   │   │   └── pricing/     # SMS pricing
│   │   ├── data/            # Data bundle endpoints
│   │   ├── billing/         # Billing API
│   │   │   ├── plans/       # List pricing plans
│   │   │   ├── subscription/# Subscription management
│   │   │   ├── checkout/    # Stripe checkout
│   │   │   ├── invoices/    # Invoice history
│   │   │   └── payment-methods/ # Payment methods
│   │   ├── dashboard/       # Dashboard API
│   │   │   └── billing/     # Billing dashboard data
│   │   ├── keys/            # API key management
│   │   └── webhooks/        # Webhook management
│   ├── api/webhooks/        # Inbound webhooks
│   │   └── stripe/          # Stripe webhook handler
│   ├── api/test-security/   # Security test endpoint
│   ├── dashboard/           # User dashboard
│   │   ├── sms/             # SMS dashboard
│   │   ├── emails/          # Email dashboard
│   │   ├── data/            # Data dashboard
│   │   ├── api-keys/        # API keys page
│   │   └── billing/         # Billing page
│   │       └── upgrade/     # Plan upgrade page
│   ├── docs/                # API documentation
│   └── (auth)/              # Auth pages
├── lib/                     # Shared utilities
│   ├── supabase/            # Database client
│   ├── email/               # Email provider
│   │   ├── resend.ts        # Resend integration
│   │   ├── billing-notifications.ts # Billing emails
│   │   └── templates/       # Email templates
│   │       └── billing.tsx  # Billing email templates
│   ├── sms/                 # SMS providers
│   │   ├── router.ts        # Provider routing
│   │   ├── twilio.ts        # Twilio integration
│   │   └── termii.ts        # Termii integration
│   ├── sandbox/             # Sandbox mode
│   ├── errors/              # Error handling
│   ├── rate-limit/          # Rate limiting
│   └── idempotency/         # Idempotency keys
├── components/              # React components
├── docs/                    # Internal documentation
│   ├── BILLING_SYSTEM.md    # Billing system docs
│   ├── STRIPE_BILLING.md    # Stripe integration
│   ├── PRICING_ANALYSIS.md  # Pricing configuration
│   └── SECURITY_TESTS.md    # Security test docs
└── migrations/              # Database migrations
    ├── 010_billing_system.sql    # Billing tables
    ├── 011_stripe_integration.sql # Stripe fields
    └── 012_billing_tracking.sql   # Billing events
```

---

## 🔗 Links

- **API Docs**: [docs.sendcomms.com](https://docs.sendcomms.com)
- **Dashboard**: [console.sendcomms.com](https://console.sendcomms.com)
- **Website**: [sendcomms.com](https://sendcomms.com)

---

## 📄 License

Proprietary - All rights reserved © 2025 SendComms

---

<p align="center">
  <strong>Built with ❤️ for Africa</strong>
</p>
