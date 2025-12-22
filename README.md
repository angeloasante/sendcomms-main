# SendComms

**A unified communications API platform for Africa**

![Status](https://img.shields.io/badge/status-active-success)
![Email API](https://img.shields.io/badge/Email%20API-✓%20Live-brightgreen)
![SMS API](https://img.shields.io/badge/SMS%20API-Coming%20Soon-yellow)
![Airtime API](https://img.shields.io/badge/Airtime%20API-Coming%20Soon-yellow)

## Overview

SendComms is a B2B API platform that enables developers and businesses to integrate multiple communication services across Africa through a single, unified API. Instead of integrating separately with SMS providers, email services, and mobile top-up platforms, businesses can use SendComms as a single integration point.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/sendcomms.git
cd sendcomms

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

## 📧 Email API (Live!)

Send transactional and marketing emails with a simple API call.

### Send Single Email

```bash
curl -X POST https://api.sendcomms.com/v1/email/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Hello from SendComms!",
    "html": "<h1>Welcome!</h1><p>Your email content here.</p>"
  }'
```

### Send Batch Emails

```bash
curl -X POST https://api.sendcomms.com/v1/email/batch \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "emails": [
      {"to": "user1@example.com", "subject": "Hello User 1", "html": "<p>Content 1</p>"},
      {"to": "user2@example.com", "subject": "Hello User 2", "html": "<p>Content 2</p>"}
    ]
  }'
```

## What Problem Does It Solve?

Businesses operating in Africa face fragmented communication infrastructure:
- Different SMS providers for different countries
- Separate integrations for email, airtime, and data services
- Complex webhook management across multiple providers
- Inconsistent API formats and authentication methods

SendComms abstracts this complexity by providing:
- **One API** to send SMS across 50+ African countries
- **One API** to send transactional and marketing emails
- **One API** to purchase airtime for any African carrier
- **One API** to purchase mobile data bundles

## 🔑 Authentication

All API requests require authentication using Bearer tokens:

```bash
Authorization: Bearer YOUR_API_KEY
```

### API Key Format
- **Production**: `ac_live_` + 48 hex characters
- **Testing**: `ac_test_` + 48 hex characters

### Security
- Keys are SHA-256 hashed before storage
- Only the hash is stored in the database
- Keys are shown once upon creation

## Core Services

### 1. Email API (`/api/v1/email/send`) ✅ Live
Send transactional and marketing emails using Resend. Features include:
- Single and batch email support
- HTML and plain text content
- CC, BCC, and Reply-To support
- Webhook notifications for delivery events
- Open/click tracking

### 2. SMS API (`/api/v1/sms/send`) 🔜 Coming Soon
Send SMS messages across Africa using Termii as the underlying provider. Features include:
- Bulk SMS support
- Custom sender IDs
- Delivery status tracking via webhooks
- Country-specific routing optimization

### 3. Airtime API (`/api/v1/airtime/purchase`) 🔜 Coming Soon
Purchase mobile airtime/credit using Reloadly. Features include:
- Support for all major African carriers
- Real-time balance top-up
- Transaction status tracking
- Operator auto-detection

### 4. Data Bundles API (`/api/v1/data/purchase`) 🔜 Coming Soon
Purchase mobile data bundles using Reloadly. Features include:
- Various data package options
- Carrier-specific bundles
- Instant activation

## 💰 Pricing

### Email
| Metric | Cost |
|--------|------|
| Per email | $0.001 |
| Minimum charge | $0.01 |
| Max recipients/email | 50 |
| Max emails/batch | 100 |

### Rate Limits

| Plan | Per Minute | Per Hour | Per Day |
|------|------------|----------|---------|
| Free | 60 | 500 | 1,000 |
| Pro | 200 | 5,000 | 50,000 |
| Enterprise | 1,000 | 20,000 | 200,000 |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Applications                     │
│              (Mobile Apps, Web Apps, Backend Services)       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      SendComms API                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐   │
│  │   SMS   │ │  Email  │ │ Airtime │ │  Data Bundles   │   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────────┬────────┘   │
└───────┼───────────┼───────────┼────────────────┼────────────┘
        │           │           │                │
        ▼           ▼           └────────┬───────┘
   ┌─────────┐ ┌─────────┐              ▼
   │ Termii  │ │ Resend  │        ┌──────────┐
   └─────────┘ └─────────┘        │ Reloadly │
                                  └──────────┘
```

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Caching/Rate Limiting**: Upstash Redis
- **Styling**: Tailwind CSS

### External Service Integrations
- **Termii** - SMS delivery across Africa
- **Resend** - Transactional email delivery
- **Reloadly** - Airtime and data bundle purchases

## Business Model

The platform operates on a usage-based pricing model:

| Plan | SMS/month | Emails/month | Price |
|------|-----------|--------------|-------|
| Free | 100 | 1,000 | $0 |
| Pro | 5,000 | 50,000 | $49/month |
| Enterprise | Unlimited | Unlimited | Custom |

Additional pay-as-you-go rates apply for airtime and data purchases.

## Key Features

### For Developers
- RESTful API with consistent JSON responses
- API key authentication
- Comprehensive webhook support
- Real-time delivery status updates
- Rate limiting and usage tracking

### For Businesses
- Dashboard for monitoring usage
- API key management
- Billing and invoicing
- Webhook configuration
- Usage analytics

## Target Market

- **Fintech companies** - Send OTPs, transaction alerts, and reward customers with airtime
- **E-commerce platforms** - Order confirmations, shipping updates, promotional campaigns
- **SaaS products** - User notifications, password resets, onboarding emails
- **Loyalty programs** - Reward customers with airtime/data instead of points
- **HR/Payroll systems** - Send payslips, distribute airtime allowances

## Webhook System

SendComms provides real-time status updates via webhooks:

### Register a Webhook

```bash
curl -X POST https://api.sendcomms.com/v1/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhooks",
    "events": ["email.sent", "email.delivered", "email.bounced"]
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "webhook-uuid",
    "url": "https://your-server.com/webhooks",
    "events": ["email.sent", "email.delivered", "email.bounced"],
    "secret": "whsec_xxx...",  // Save this! Only shown once
    "active": true
  }
}
```

### Webhook Payload

```json
{
  "event": "email.delivered",
  "transaction_id": "txn_abc123",
  "timestamp": "2025-12-21T10:30:00Z",
  "data": {
    "id": "txn_xxx",
    "email_id": "abc123-def456",
    "status": "delivered",
    "to": "recipient@example.com"
  }
}
```

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

### Email Events
```
email.sent       → Email accepted by mail server
email.delivered  → Email delivered to inbox
email.bounced    → Email bounced
email.complained → Marked as spam
email.opened     → Email opened (tracking enabled)
email.clicked    → Link clicked (tracking enabled)
```

### SMS Events (Coming Soon)
```
sms.sent       → SMS successfully sent to carrier
sms.delivered  → SMS delivered to recipient
sms.failed     → SMS delivery failed
```

### Airtime/Data Events (Coming Soon)
```
airtime.success → Airtime purchase completed
airtime.failed  → Airtime purchase failed
data.success    → Data bundle activated
data.failed     → Data bundle purchase failed
```

## 📚 API Documentation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/email/send` | POST | Send single email |
| `/api/v1/email/batch` | POST | Send batch emails (up to 100) |
| `/api/v1/webhooks` | POST | Register webhook endpoint |
| `/api/v1/webhooks` | GET | List your webhooks |
| `/api/v1/webhooks?id=xxx` | DELETE | Delete a webhook |
| `/api/webhooks/resend` | POST | Receive email webhooks from Resend |

### Interactive Docs
Visit `/docs/api/email` for interactive API documentation with code examples in:
- cURL
- Node.js / JavaScript
- Python
- PHP

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in your API keys
3. Install dependencies: `npm install`
4. Run development server: `npm run dev`
5. Visit `http://localhost:3000`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `RELOADLY_CLIENT_ID` | Reloadly API client ID |
| `RELOADLY_CLIENT_SECRET` | Reloadly API secret |
| `TERMII_API_KEY` | Termii API key |
| `RESEND_API_KEY` | Resend API key |

## Project Structure

```
sendcomms/
├── app/
│   ├── api/
│   │   ├── v1/                    # Versioned API endpoints
│   │   │   ├── sms/send/
│   │   │   ├── email/send/
│   │   │   ├── airtime/purchase/
│   │   │   └── data/purchase/
│   │   ├── webhooks/              # Incoming webhooks from providers
│   │   │   ├── termii/
│   │   │   ├── resend/
│   │   │   └── reloadly/
│   │   └── cron/                  # Scheduled jobs
│   ├── dashboard/                 # Admin dashboard pages
│   ├── docs/                      # API documentation
│   └── (marketing)/               # Public marketing pages
├── lib/                           # Shared utilities
│   ├── api-helpers.ts
│   ├── reloadly.ts
│   ├── supabase/
│   └── redis.ts
├── components/                    # React components
└── public/                        # Static assets
```

## License

Proprietary - All rights reserved

---

## 🔗 Links

- **Documentation**: `/docs/api/email`
- **Dashboard**: `/dashboard`
- **Pricing**: `/pricing`

---

*Built with ❤️ for Africa*
