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
  <img src="https://img.shields.io/badge/Data%20API-✓%20Live-brightgreen" alt="Data API" />
  <img src="https://img.shields.io/badge/SMS%20API-Coming%20Soon-yellow" alt="SMS API" />
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
| `INSUFFICIENT_BALANCE` | 402 | Account balance too low |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

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

### Data Bundles

Prices vary by operator and package. Check the dashboard for current rates.

### Rate Limits

| Plan | Per Minute | Per Hour | Per Day |
|------|------------|----------|---------|
| Free | 60 | 500 | 1,000 |
| Pro | 200 | 5,000 | 50,000 |
| Enterprise | 1,000 | 20,000 | 200,000 |

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
   ┌─────────┐ ┌─────────┐              ▼
   │  Brevo  │ │ Termii  │        ┌──────────┐
   │ (Email) │ │  (SMS)  │        │ Reloadly │
   └─────────┘ └─────────┘        └──────────┘
```

---

## 📚 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/email/send` | POST | Send single email |
| `/v1/email/batch` | POST | Send batch emails (up to 100) |
| `/v1/data/purchase` | POST | Purchase data bundle |
| `/v1/data/operators` | GET | List available operators |
| `/v1/data/packages` | GET | List data packages |
| `/v1/webhooks` | POST | Register webhook |
| `/v1/webhooks` | GET | List webhooks |
| `/v1/webhooks` | DELETE | Delete webhook |
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
- **Styling**: Tailwind CSS

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
| `BREVO_API_KEY` | Brevo API key |
| `RELOADLY_CLIENT_ID` | Reloadly client ID |
| `RELOADLY_CLIENT_SECRET` | Reloadly client secret |

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
│   │   ├── data/            # Data bundle endpoints
│   │   └── webhooks/        # Webhook management
│   ├── dashboard/           # User dashboard
│   ├── docs/                # API documentation
│   └── (marketing)/         # Public pages
├── lib/                     # Shared utilities
│   ├── supabase/            # Database client
│   ├── email/               # Email provider
│   └── rate-limit/          # Rate limiting
├── components/              # React components
└── public/                  # Static assets
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
