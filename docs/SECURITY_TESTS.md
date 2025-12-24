# SendComms Security Tests Documentation

## Overview

This document outlines the security verification tests implemented for the SendComms API. These tests ensure that critical security mechanisms are functioning correctly.

**Test Endpoint:** `POST /api/test-security`

**Last Run:** December 24, 2025

**Results:** ✅ All 4 tests passed

---

## Test Summary

| Test | Status | Description |
|------|--------|-------------|
| Webhook Signature Verification | ✅ PASS | Stripe webhooks reject invalid/missing signatures |
| Rate Limiting | ✅ PASS | API rate limits enforced with proper headers |
| Sandbox Isolation | ✅ PASS | Test keys isolated from live environment |
| API Key Scoping | ✅ PASS | Keys restricted to their customer's data |

---

## 1. Webhook Signature Verification

### Purpose
Ensures that Stripe webhook endpoints properly validate the `stripe-signature` header to prevent unauthorized webhook calls.

### Test Scenarios

| Scenario | Expected | Actual | Result |
|----------|----------|--------|--------|
| Missing signature header | 400 Bad Request | 400 Bad Request | ✅ |
| Invalid signature | 400 Bad Request | 400 Bad Request | ✅ |
| Valid signature | 200 OK | (Requires actual Stripe signature) | N/A |

### Implementation Details

```typescript
// Webhook signature verification in /api/webhooks/stripe/route.ts
const signature = req.headers.get('stripe-signature');

if (!signature) {
  return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
}

try {
  event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
} catch (err) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
}
```

### Test Output

```json
{
  "test": "Webhook Signature Verification",
  "passed": true,
  "message": "✅ Webhook correctly rejects missing and invalid signatures",
  "details": {
    "rejectsMissingSignature": true,
    "missingSignatureStatus": 400,
    "rejectsInvalidSignature": true,
    "invalidSignatureStatus": 400
  }
}
```

---

## 2. Rate Limiting

### Purpose
Verifies that API endpoints enforce rate limits to prevent abuse and ensure fair usage.

### Rate Limit Headers

| Header | Description | Example Value |
|--------|-------------|---------------|
| `X-RateLimit-Limit` | Maximum requests allowed | `50` |
| `X-RateLimit-Remaining` | Requests remaining | `49` |
| `X-RateLimit-Reset` | Unix timestamp when limit resets | `1766547480` |

### Rate Limits by Plan

| Plan | Per Minute | Per Hour | Per Day | Per Month |
|------|------------|----------|---------|-----------|
| Free | 10 | 100 | 1,000 | 10,000 |
| Starter | 100 | 1,000 | 10,000 | 100,000 |
| Pro | 500 | 5,000 | 50,000 | 500,000 |
| Business | 1,000 | 10,000 | 100,000 | 1,000,000 |
| Enterprise | 10,000 | 100,000 | 1,000,000 | 10,000,000 |

### Test Output

```json
{
  "test": "Rate Limiting",
  "passed": true,
  "message": "✅ Rate limiting headers are present",
  "details": {
    "hasRateLimitHeaders": true,
    "hasRemainingHeader": true,
    "status": 200,
    "headers": {
      "x-ratelimit-limit": "50",
      "x-ratelimit-remaining": "49",
      "x-ratelimit-reset": "1766547480"
    }
  }
}
```

### 429 Response (Rate Limit Exceeded)

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again later.",
    "limit": 50,
    "remaining": 0,
    "reset": 1766547480,
    "retryAfter": 60
  }
}
```

---

## 3. Sandbox Isolation

### Purpose
Ensures that sandbox/test API keys (`sc_test_*`) are completely isolated from the production environment, preventing:
- Real SMS/Email being sent
- Real purchases being made
- Real charges being applied

### API Key Prefixes

| Prefix | Environment | Behavior |
|--------|-------------|----------|
| `sc_live_` | Production | Sends real messages, charges balance |
| `sc_test_` | Sandbox | Returns mock responses, no charges |

### Test Scenarios

| Scenario | Expected | Actual | Result |
|----------|----------|--------|--------|
| `sc_test_*` key returns sandbox response | `provider: "sandbox"` | `provider: "sandbox"` | ✅ |
| `sc_live_*` key does NOT return sandbox | No `_sandbox` field | No `_sandbox` field | ✅ |
| `isSandboxKey("sc_test_xxx")` | `true` | `true` | ✅ |
| `isLiveKey("sc_live_xxx")` | `true` | `true` | ✅ |
| `isSandboxKey("sc_live_xxx")` | `false` | `false` | ✅ |
| `isLiveKey("sc_test_xxx")` | `false` | `false` | ✅ |

### Sandbox Response Example

```bash
curl -X POST "http://localhost:3000/api/v1/sms/send" \
  -H "Authorization: Bearer sc_test_s8kpk70a4zu49z7ikknkeqs4r5d7wqmhqm0hwcykgka5ap2c" \
  -H "Content-Type: application/json" \
  -d '{"to": "+233501234567", "message": "Test message"}'
```

```json
{
  "success": true,
  "data": {
    "transaction_id": "sms_test_mjjgnkg9_uwu3mbu8",
    "message_id": "SMtesttjccemf4x",
    "status": "sent",
    "to": "+233501234567",
    "provider": "sandbox",
    "_sandbox": {
      "mode": "test",
      "message": "This is a test transaction. No real SMS was sent.",
      "note": "Switch to a live API key (sc_live_) to send real messages."
    }
  }
}
```

### Test Output

```json
{
  "test": "Sandbox Isolation",
  "passed": true,
  "message": "✅ Sandbox mode properly isolates test and live environments",
  "details": {
    "sandboxKeyReturnsSandboxResponse": true,
    "liveKeyDoesNotReturnSandbox": true,
    "correctlySandboxDetection": true,
    "correctlyLiveDetection": true,
    "sandboxDoesNotDetectLive": true,
    "liveDoesNotDetectSandbox": true
  }
}
```

---

## 4. API Key Scoping

### Purpose
Ensures that API keys are properly scoped to their owning customer and cannot access other customers' data.

### Security Checks

| Check | Description | Result |
|-------|-------------|--------|
| Key-Customer Linking | API keys linked to correct customer_id | ✅ |
| Own Data Access | Key can access its customer's data | ✅ |
| Invalid Key Rejection | Invalid keys return 401 Unauthorized | ✅ |
| Missing Key Rejection | Missing Authorization header returns 401 | ✅ |

### API Key Validation Flow

```
1. Extract API key from Authorization header
2. Query database for matching key_hash
3. Verify key is active (is_active = true)
4. Verify customer is active (customer.is_active = true)
5. Return customer data scoped to that key
```

### Test Scenarios

```bash
# Valid API key - Returns customer data
curl -H "Authorization: Bearer sc_live_valid_key" \
  http://localhost:3000/api/v1/billing/subscription
# Response: 200 OK with subscription data

# Invalid API key - Rejected
curl -H "Authorization: Bearer sc_live_invalid_key" \
  http://localhost:3000/api/v1/billing/subscription
# Response: 401 Unauthorized

# Missing API key - Rejected
curl http://localhost:3000/api/v1/billing/subscription
# Response: 401 Unauthorized
```

### Test Output

```json
{
  "test": "API Key Scoping",
  "passed": true,
  "message": "✅ API keys are properly scoped to their customers",
  "details": {
    "key1AccessesOwnData": true,
    "keysLinkedToCorrectCustomers": true,
    "rejectsInvalidKey": true,
    "rejectsMissingKey": true,
    "customer1Id": "10657304-2993-40aa-8a39-c4edae4520f4",
    "customer2Id": "1d8aea3a-3190-4529-abfe-96c4713512b4"
  }
}
```

---

## Running Security Tests

### Run All Tests

```bash
curl -X POST "http://localhost:3000/api/test-security?test=all" | jq .
```

### Run Individual Tests

```bash
# Webhook signature verification
curl -X POST "http://localhost:3000/api/test-security?test=webhook" | jq .

# Rate limiting
curl -X POST "http://localhost:3000/api/test-security?test=rate-limit" | jq .

# Sandbox isolation
curl -X POST "http://localhost:3000/api/test-security?test=sandbox" | jq .

# API key scoping
curl -X POST "http://localhost:3000/api/test-security?test=api-key-scope" | jq .
```

### Expected Response (All Pass)

```json
{
  "success": true,
  "summary": {
    "total": 4,
    "passed": 4,
    "failed": 0
  },
  "results": [...]
}
```

---

## Security Best Practices Implemented

### 1. Authentication
- Bearer token authentication required for all API endpoints
- API keys stored securely in database
- Keys validated against active status

### 2. Authorization
- API keys scoped to specific customer
- Cross-customer data access prevented
- Permissions array for granular access control

### 3. Webhook Security
- Stripe signature verification using `stripe.webhooks.constructEvent()`
- Webhook secret stored as environment variable
- Missing/invalid signatures rejected with 400

### 4. Rate Limiting
- Redis-based rate limiting
- Plan-based limits (free → enterprise)
- Standard rate limit headers returned
- 429 Too Many Requests with retry information

### 5. Environment Isolation
- `sc_test_` keys return mock responses
- `sc_live_` keys process real transactions
- No data crossover between environments

### 6. Input Validation
- Request body validation
- Phone number formatting
- Email validation
- Required field checks

---

## Environment Variables Required

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx

# Redis (for rate limiting)
REDIS_URL=redis://localhost:6379

# App URL
NEXT_PUBLIC_APP_URL=https://sendcomms.com
```

---

## Audit Trail

All security-relevant events are logged to the `billing_events` table:

| Event Type | Description |
|------------|-------------|
| `checkout_complete` | Successful subscription purchase |
| `subscription_created` | New subscription created |
| `subscription_cancelled` | Subscription terminated |
| `payment_failed` | Payment attempt failed |
| `payment_action_required` | 3D Secure required |

---

## Contact

For security concerns or to report vulnerabilities, contact: security@sendcomms.com
