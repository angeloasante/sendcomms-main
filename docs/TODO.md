# SendComms - Development Roadmap & TODO

> Last Updated: December 21, 2025

---

## ✅ COMPLETED

### Phase 1: Foundation
- [x] Next.js 16 project setup with App Router
- [x] TypeScript configuration
- [x] Tailwind CSS styling
- [x] Project folder structure
- [x] Environment variable setup

### Phase 2: Email Service (Resend)
- [x] Resend SDK integration (`lib/email/resend.ts`)
- [x] Single email endpoint (`/api/v1/email/send`)
- [x] Batch email endpoint (`/api/v1/email/batch`)
- [x] Email templates (Welcome, Receipt)
- [x] Resend webhook handler
- [x] **Test email sent successfully** ✉️

### Phase 3: Core Infrastructure
- [x] Rate limiting system (multi-tier)
- [x] API key validation
- [x] Pricing engine
- [x] Balance management
- [x] Transaction logging
- [x] Webhook forwarding system
- [x] Database schema (Supabase)
- [x] Lazy initialization for build compatibility


### Phase 4: Redis Setup
- [x] **DONE**: Set up Upstash Redis ✅
  - URL: https://right-kangaroo-43258.upstash.io
  - Token configured in `.env.local`

### Phase 5: Database Setup
- [x] **DONE**: Run database schema ✅
  - Tables created: customers, api_keys, transactions, usage_logs, webhook_logs

### Phase 6: First Customer & API Key
- [x] **DONE**: Created first customer ✅
  - Email: admin@sendcomms.com
  - Balance: $100
  - Plan: enterprise
- [x] **DONE**: Created first API key ✅
  - Key: `ac_live_8be6e26c12a5584f090116b9c52c3814c376c4318125e668`
- [x] **DONE**: Tested email API ✅
  - Test email sent to angeloasante958@gmail.com
  - Response: `{"success":true,"data":{"id":"email_mjgaw0tn_6bb5f9e6c11e"...}}`

### Phase 7: Documentation
- [x] **DONE**: Created API docs page ✅
  - Beautiful dark theme docs at `/docs/api/email`
  - Includes request/response examples
  - Code snippets for cURL, Node.js, Python, PHP


## 🔄 IN PROGRESS

#### 2. SMS Service (Termii)
```
Priority: HIGH
Estimated: 2-3 hours
```

Files to create:
- [ ] `lib/sms/termii.ts` - Termii SDK wrapper
- [ ] Update `app/api/v1/sms/send/route.ts` - Full implementation
- [ ] `app/api/webhooks/termii/route.ts` - Webhook handler

Tasks:
- [ ] Sign up at [termii.com](https://termii.com)
- [ ] Get API key and Sender ID
- [ ] Implement send SMS function
- [ ] Add Nigerian number validation
- [ ] Set up delivery webhooks
- [ ] Test with real Nigerian number

#### 3. Airtime Service (Reloadly)
```
Priority: HIGH
Estimated: 3-4 hours
```

Files to create:
- [ ] `lib/airtime/reloadly.ts` - Reloadly SDK wrapper
- [ ] Update `app/api/v1/airtime/purchase/route.ts`

Tasks:
- [ ] Sign up at [reloadly.com](https://reloadly.com)
- [ ] Get sandbox credentials first
- [ ] Get operator list for African countries
- [ ] Implement airtime purchase
- [ ] Handle async fulfillment
- [ ] Add transaction tracking

#### 4. Data Bundle Service (Reloadly)
```
Priority: MEDIUM
Estimated: 2-3 hours
```

- [ ] `lib/data/reloadly.ts` - Data bundle wrapper
- [ ] Update `app/api/v1/data/purchase/route.ts`
- [ ] Get data plans by operator
- [ ] Implement purchase flow

---

### Short Term (Next 2 Weeks)

#### 5. Customer Dashboard UI
```
Priority: HIGH
Estimated: 1-2 days
```

- [ ] `/dashboard` - Overview with stats
- [ ] `/dashboard/api-keys` - Manage API keys
- [ ] `/dashboard/transactions` - Transaction history
- [ ] `/dashboard/billing` - Balance & payments
- [ ] `/dashboard/settings` - Webhooks, profile

#### 6. Authentication System
```
Priority: HIGH
Estimated: 4-6 hours
```

- [ ] Sign up flow (`/signup`)
- [ ] Sign in flow (`/signin`)
- [ ] Email verification
- [ ] Password reset
- [ ] Session management

#### 7. Payment Integration
```
Priority: HIGH
Estimated: 1 day
```

Options:
- [ ] **Paystack** (for Africa) - Recommended
- [ ] **Stripe** (for international)
- [ ] **Flutterwave** (alternative)

Tasks:
- [ ] Create payment endpoints
- [ ] Implement webhook handlers
- [ ] Auto top-up feature
- [ ] Invoice generation

---

### Medium Term (Next Month)

#### 8. Admin Dashboard
- [ ] Customer management
- [ ] Transaction overview
- [ ] Revenue analytics
- [ ] Manual balance adjustment
- [ ] Support ticket system

#### 9. Developer Experience
- [ ] **Node.js SDK** (`npm install sendcomms`)
- [ ] **Python SDK** (`pip install sendcomms`)
- [ ] Postman collection
- [ ] API playground
- [ ] Improved documentation

#### 10. Advanced Email Features
- [ ] Email templates library
- [ ] Drag-and-drop editor
- [ ] Scheduled sending
- [ ] Contact lists
- [ ] Analytics (opens, clicks)

---

### Long Term (Next Quarter)

#### 11. Voice API
- [ ] Research voice providers (Twilio, Africa's Talking)
- [ ] Voice calls
- [ ] IVR systems
- [ ] Call recording

#### 12. WhatsApp Business API
- [ ] Meta Business API integration
- [ ] Template messages
- [ ] Interactive messages
- [ ] Chatbot support

#### 13. Scale & Optimization
- [ ] Multi-region deployment
- [ ] Database read replicas
- [ ] CDN for assets
- [ ] Queue system for high volume
- [ ] Caching optimization

---

## 🛠️ Technical Debt

- [ ] Add comprehensive error handling
- [ ] Implement request logging/tracing
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Set up CI/CD pipeline
- [ ] Add monitoring (Sentry, LogRocket)
- [ ] Performance benchmarking

---

## 📁 Files That Need Work

### Placeholder Files (Need Implementation)

| File | Status | Priority |
|------|--------|----------|
| `app/api/v1/sms/send/route.ts` | Placeholder | HIGH |
| `app/api/v1/airtime/purchase/route.ts` | Placeholder | HIGH |
| `app/api/v1/data/purchase/route.ts` | Placeholder | MEDIUM |
| `app/api/webhooks/termii/route.ts` | Placeholder | HIGH |
| `app/api/webhooks/reloadly/route.ts` | Placeholder | HIGH |
| `app/dashboard/page.tsx` | Basic | MEDIUM |
| `app/dashboard/api-keys/page.tsx` | Basic | MEDIUM |
| `app/dashboard/billing/page.tsx` | Basic | MEDIUM |

### Library Files Needed

| File | Purpose | Priority |
|------|---------|----------|
| `lib/sms/termii.ts` | Termii SDK wrapper | HIGH |
| `lib/airtime/reloadly.ts` | Reloadly airtime | HIGH |
| `lib/data/reloadly.ts` | Reloadly data | MEDIUM |
| `lib/payments/paystack.ts` | Payment processing | HIGH |

---

## 💰 Revenue Projections

### Break-even Analysis

| Expense | Monthly Cost |
|---------|-------------|
| Vercel Pro | $20 |
| Supabase Pro | $25 |
| Upstash Pro | $10 |
| Resend Pro | $20 |
| Domain | $1 |
| **Total** | **$76/month** |

### Revenue Needed
At $0.0006 profit per email:
- Break-even: ~127,000 emails/month
- Or: ~5,000 SMS at $0.01 profit each

### Growth Targets

| Month | Customers | Revenue |
|-------|-----------|---------|
| 1 | 10 | $100 |
| 3 | 50 | $500 |
| 6 | 200 | $2,000 |
| 12 | 500 | $5,000 |

---

## 📞 API Access for Customers

### How Customers Will Use Your API

Once set up, customers can access your API like this:

```javascript
// Customer's code
const response = await fetch('https://api.sendcomms.com/v1/email/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ac_live_xxxxxxxxxxxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Hello!',
    html: '<p>Message content</p>'
  })
});

const result = await response.json();
console.log(result.data.id); // Transaction ID
```

### Future: SendComms SDK

```javascript
// npm install sendcomms
import { SendComms } from 'sendcomms';

const client = new SendComms('ac_live_xxxxxxxxxxxx');

// Send email
await client.email.send({
  to: 'user@example.com',
  subject: 'Hello!',
  html: '<p>Content</p>'
});

// Send SMS
await client.sms.send({
  to: '+2348012345678',
  message: 'Hello from SendComms!'
});

// Purchase airtime
await client.airtime.purchase({
  phone: '+2348012345678',
  amount: 500,
  country: 'NG'
});
```

---

## 🔗 Useful Links

- [Resend Docs](https://resend.com/docs)
- [Termii Docs](https://developers.termii.com)
- [Reloadly Docs](https://developers.reloadly.com)
- [Supabase Docs](https://supabase.com/docs)
- [Upstash Docs](https://upstash.com/docs)
- [Paystack Docs](https://paystack.com/docs)
- [Next.js Docs](https://nextjs.org/docs)

---

## Notes

- Always test with sandbox/test credentials first
- Keep API keys secure and never commit to git
- Monitor costs closely in early stages
- Start with Nigerian market, expand to other African countries

---

*Keep this document updated as you complete tasks!*
