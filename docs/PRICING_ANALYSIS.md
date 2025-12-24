# SendComms API - Pricing & Billing Analysis

## Executive Summary

This document provides a comprehensive analysis of the pricing structure, rate limits, and billing configuration in the SendComms (AfricaComms) API.

---

## 1. Service Pricing Configuration

### Core Pricing (`lib/api-helpers.ts`)

| Service | Provider Cost | Customer Price | Markup | Min Charge |
|---------|--------------|----------------|--------|------------|
| **Email** | $0.0004/email | $0.001/email | 150% | $0.01/request |
| **SMS** | $0.02/SMS (avg) | $0.035/SMS | 75% | $0.05/request |
| **Airtime** | Variable | Cost + 3% | 3% margin | $0.10 min margin |
| **Data** | Variable | Cost + 5% | 5% margin | $0.15 min margin |

---

## 2. SMS Pricing by Region

### SMS Pricing Table (`app/api/v1/sms/pricing/route.ts`)

All SMS prices include a **15% markup** from provider cost.

#### Africa (via Termii - Primary Provider)
| Country | Code | Provider Cost | Customer Price |
|---------|------|---------------|----------------|
| Ghana | +233 | $0.025 | $0.02875 |
| Nigeria | +234 | $0.025 | $0.02875 |
| Kenya | +254 | $0.025 | $0.02875 |
| South Africa | +27 | $0.025 | $0.02875 |
| Uganda | +256 | $0.025 | $0.02875 |
| Tanzania | +255 | $0.025 | $0.02875 |
| Cameroon | +237 | $0.025 | $0.02875 |
| Côte d'Ivoire | +225 | $0.025 | $0.02875 |
| Senegal | +221 | $0.025 | $0.02875 |
| Gambia | +220 | $0.025 | $0.02875 |

#### North America (via Twilio)
| Country | Code | Provider Cost | Customer Price |
|---------|------|---------------|----------------|
| USA/Canada | +1 | $0.0079 | $0.0091 |

#### Europe (via Twilio)
| Country | Code | Provider Cost | Customer Price |
|---------|------|---------------|----------------|
| United Kingdom | +44 | $0.0400 | $0.0460 |
| Germany | +49 | $0.0550 | $0.0633 |
| France | +33 | $0.0650 | $0.0748 |
| Spain | +34 | $0.0700 | $0.0805 |
| Italy | +39 | $0.0600 | $0.0690 |
| Netherlands | +31 | $0.0750 | $0.0863 |

#### Asia (via Twilio)
| Country | Code | Provider Cost | Customer Price |
|---------|------|---------------|----------------|
| India | +91 | $0.0250 | $0.0288 |
| China | +86 | $0.0350 | $0.0403 |
| Japan | +81 | $0.0650 | $0.0748 |
| South Korea | +82 | $0.0300 | $0.0345 |
| Singapore | +65 | $0.0400 | $0.0460 |
| UAE | +971 | $0.0350 | $0.0403 |

#### Oceania (via Twilio)
| Country | Code | Provider Cost | Customer Price |
|---------|------|---------------|----------------|
| Australia | +61 | $0.0450 | $0.0518 |
| New Zealand | +64 | $0.0550 | $0.0633 |

### SMS Provider Routing Logic

```
IF destination is AFRICA
  → Route to Termii (cheaper for African countries)
  → Fallback to Twilio if Termii fails
ELSE
  → Route to Twilio
  → Fallback to Termii only for African numbers
```

---

## 3. Rate Limits by Plan

### Global Rate Limits (`lib/rate-limit/index.ts`)

| Plan | Per Minute | Per Hour | Per Day | Per Month |
|------|------------|----------|---------|-----------|
| **Free** | 10 | 100 | 1,000 | 10,000 |
| **Starter** | 100 | 1,000 | 10,000 | 100,000 |
| **Pro** | 1,000 | 10,000 | 100,000 | 1,000,000 |
| **Enterprise** | 10,000 | 100,000 | 1,000,000 | 10,000,000 |

### Service-Specific Limits

#### SMS Limits
| Plan | Per Minute | Per Day |
|------|------------|---------|
| Free | 5 | 100 |
| Starter | 50 | 1,000 |
| Pro | 500 | 10,000 |
| Enterprise | 5,000 | 100,000 |

#### Email Limits
| Plan | Per Minute | Per Day |
|------|------------|---------|
| Free | 10 | 500 |
| Starter | 100 | 5,000 |
| Pro | 1,000 | 50,000 |
| Enterprise | 10,000 | 500,000 |

#### Airtime Limits
| Plan | Per Minute | Per Day |
|------|------------|---------|
| Free | 2 | 50 |
| Starter | 20 | 500 |
| Pro | 200 | 5,000 |
| Enterprise | 2,000 | 50,000 |

#### Data Limits
| Plan | Per Minute | Per Day |
|------|------------|---------|
| Free | 2 | 50 |
| Starter | 20 | 500 |
| Pro | 200 | 5,000 |
| Enterprise | 2,000 | 50,000 |

---

## 4. Data Package Pricing

### Ghana Data Packages (via Datamart)

Data packages use a **configurable margin** stored in `pricing_settings` table:
- Default margin: **15%**
- Applied on top of provider price

#### Networks Supported
| Provider Code | Display Name |
|---------------|--------------|
| YELLO | MTN Ghana |
| TELECEL | Telecel (Vodafone) |
| AT_PREMIUM | AirtelTigo |

---

## 5. Customer Plans

### Plan Types (from `database/schema.sql`)

| Plan | Type | Balance Required |
|------|------|------------------|
| `free` | Post-paid (included) | No |
| `starter` | Post-paid | No |
| `pro` | Post-paid | No |
| `enterprise` | Post-paid | No |
| `prepaid` | Pre-paid | Yes |

### Balance Management
- Only `prepaid` customers require balance checks
- Balance deduction happens via `deduct_balance` RPC function
- Atomic operations prevent race conditions

---

## 6. Transaction Cost Tracking

### Database Schema (`transactions` table)

| Field | Purpose |
|-------|---------|
| `cost` | What SendComms pays the provider |
| `price` | What customer is charged |
| `margin` | Profit per transaction |
| `currency` | Transaction currency (default: USD) |

---

## 7. Webhook Providers

### Inbound Webhooks (Status Updates)
| Provider | Endpoint | Purpose |
|----------|----------|---------|
| Reloadly | `/api/webhooks/reloadly` | Airtime/Data status |
| Resend | `/api/webhooks/resend` | Email delivery status |
| Termii | `/api/webhooks/termii` | SMS delivery status |

---

## 8. Current Billing Page Issues

### Dashboard Billing (`app/dashboard/billing/page.tsx`)

**Current State:**
- Shows hardcoded "Free Plan" with "1,000 SMS / 10,000 Emails per month"
- No actual plan detection from database
- No payment method integration
- No upgrade flow

**Needed Improvements:**
1. Fetch actual plan from customer data
2. Display correct limits based on plan
3. Integrate payment provider (Stripe/Paystack)
4. Add usage visualization
5. Implement plan upgrade/downgrade flow

---

## 9. Pricing Discrepancies Found

### Issue 1: Billing Page vs Actual Limits
| Source | SMS Limit (Free) | Email Limit (Free) |
|--------|------------------|-------------------|
| Billing Page | 1,000/month | 10,000/month |
| Rate Limits | 100/day (3,000/month) | 500/day (15,000/month) |

**Recommendation:** Update billing page to reflect actual rate limits.

### Issue 2: Landing Page vs API Pricing
| Source | Free SMS | Free Emails |
|--------|----------|-------------|
| Landing Page | 50/month | 500/month |
| API Rate Limits | 100/day | 500/day |

**Recommendation:** Align landing page pricing with API configuration.

### Issue 3: Plan Name Inconsistency
- Landing page uses: `Free`, `Starter`, `Pro`, `Business`, `Enterprise`
- API uses: `free`, `starter`, `pro`, `enterprise` (no `business`)

**Recommendation:** Add `business` plan to API or adjust landing page.

---

## 10. Profit Margin Analysis

### Email Service
- Cost: $0.0004/email (Resend)
- Price: $0.001/email
- **Profit: $0.0006/email (150% margin)**

### SMS Service (Africa)
- Cost: $0.025/SMS (Termii)
- Price: $0.02875/SMS (15% markup)
- **Profit: $0.00375/SMS**

### SMS Service (USA)
- Cost: $0.0079/SMS (Twilio)
- Price: $0.0091/SMS (15% markup)
- **Profit: $0.0012/SMS**

### Airtime
- Variable cost
- **Profit: 3% margin (min $0.10)**

### Data
- Variable cost (15% default margin)
- **Profit: 5% margin (min $0.15)**

---

## 11. Recommendations

### Immediate Actions

1. **Sync pricing across all surfaces**
   - Update landing page to match API limits
   - Update billing page to show actual plan data

2. **Add `business` plan to API**
   ```typescript
   business: {
     perMinute: 500,
     perHour: 5000,
     perDay: 50000,
     perMonth: 500000
   }
   ```

3. **Fix billing page to fetch real data**
   ```typescript
   // Fetch customer plan and usage
   const { data: customer } = await supabase
     .from('customers')
     .select('plan, balance')
     .eq('id', customerId)
     .single();
   ```

### Future Enhancements

1. Add Stripe/Paystack integration for payments
2. Implement usage-based billing alerts
3. Add overage pricing for exceeded limits
4. Create admin dashboard for pricing management
5. Add promotional codes/discounts system

---

## Summary Tables

### Quick Reference: Service Pricing

| Service | Price | Notes |
|---------|-------|-------|
| Email | $0.001/email | 150% markup |
| SMS (Africa) | $0.02875/SMS | Via Termii |
| SMS (USA) | $0.0091/SMS | Via Twilio |
| SMS (Europe) | $0.046-0.086/SMS | Via Twilio |
| Airtime | Cost + 3% | Min $0.10 profit |
| Data | Cost + 5-15% | Min $0.15 profit |

### Quick Reference: Plan Limits (Monthly)

| Service | Free | Starter | Pro | Enterprise |
|---------|------|---------|-----|------------|
| Global Requests | 10K | 100K | 1M | 10M |
| SMS | ~3K | ~30K | ~300K | ~3M |
| Email | ~15K | ~150K | ~1.5M | ~15M |
| Airtime | ~1.5K | ~15K | ~150K | ~1.5M |
| Data | ~1.5K | ~15K | ~150K | ~1.5M |

---

*Last Updated: December 24, 2025*
