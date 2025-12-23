# Rate Limiting & Idempotency Implementation

## Overview

This document details the rate limiting and idempotency implementations for the SendComms API platform. Both features are powered by **Upstash Redis** for high performance and reliability.

---

## Table of Contents

1. [Rate Limiting](#rate-limiting)
   - [Configuration](#rate-limit-configuration)
   - [Service Limits](#service-rate-limits)
   - [API Coverage](#rate-limit-api-coverage)
   - [Response Headers](#rate-limit-headers)
   - [Error Response](#rate-limit-error-response)
2. [Idempotency](#idempotency)
   - [How It Works](#how-idempotency-works)
   - [Redis Implementation](#redis-idempotency-implementation)
   - [API Coverage](#idempotency-api-coverage)
   - [Usage](#idempotency-usage)
   - [Response Format](#idempotency-response-format)
3. [Test Results](#test-results)
4. [Architecture](#architecture)

---

## Rate Limiting

### Rate Limit Configuration

Rate limits are enforced using a **sliding window** algorithm implemented with Upstash Redis. Limits are applied per customer and per service.

**Location:** `lib/rate-limit/index.ts`

### Service Rate Limits

| Service | Plan | Per Minute | Per Day |
|---------|------|------------|---------|
| **SMS** | Free | 5 | 100 |
| | Starter | 50 | 1,000 |
| | Pro | 200 | 10,000 |
| | Enterprise | 1,000 | 100,000 |
| **Email** | Free | 10 | 500 |
| | Starter | 100 | 5,000 |
| | Pro | 500 | 50,000 |
| | Enterprise | 2,000 | 500,000 |
| **Data** | Free | 2 | 50 |
| | Starter | 20 | 500 |
| | Pro | 100 | 5,000 |
| | Enterprise | 500 | 50,000 |
| **Airtime** | Free | 2 | 50 |
| | Starter | 20 | 500 |
| | Pro | 100 | 5,000 |
| | Enterprise | 500 | 50,000 |

### Rate Limit API Coverage

| API Endpoint | Rate Limited | Service Type |
|--------------|--------------|--------------|
| `POST /api/v1/sms/send` | ✅ Yes | `sms` |
| `POST /api/v1/email/send` | ✅ Yes | `email` |
| `POST /api/v1/email/batch` | ✅ Yes | `email` |
| `POST /api/v1/data/purchase` | ✅ Yes | `data` |
| `GET /api/v1/*/pricing` | ❌ No | N/A |
| `GET /api/v1/*/status` | ❌ No | N/A |

### Rate Limit Headers

All rate-limited endpoints return the following headers:

```
X-RateLimit-Limit: 5          # Maximum requests allowed in window
X-RateLimit-Remaining: 3      # Requests remaining in current window
X-RateLimit-Reset: 1766452500 # Unix timestamp when limit resets
```

### Rate Limit Error Response

When rate limit is exceeded, the API returns HTTP 429:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again later.",
    "limit": 5,
    "remaining": 0,
    "reset": 1766452500,
    "retryAfter": 39
  }
}
```

**Headers on 429 response:**
```
Retry-After: 39
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1766452500
```

---

## Idempotency

### How Idempotency Works

Idempotency ensures that duplicate API requests with the same `idempotency_key` return the same response without re-processing the request. This prevents:

- **Double charges** - Same purchase isn't processed twice
- **Duplicate SMS/emails** - Same message isn't sent multiple times
- **Data integrity issues** - Network retries don't cause duplicate transactions

### Redis Idempotency Implementation

**Location:** `lib/idempotency/index.ts`

The implementation provides:

1. **Cache Check** - Check if idempotency key exists in Redis
2. **Distributed Locking** - Prevent concurrent duplicate processing
3. **Response Storage** - Cache successful responses for 24 hours
4. **Automatic Cleanup** - Redis TTL handles key expiration

**Key Format:**
```
idempotency:{customer_id}:{service}:{idempotency_key}
```

**TTL:** 24 hours (86,400 seconds)

### Idempotency API Coverage

| API Endpoint | Idempotency Support |
|--------------|---------------------|
| `POST /api/v1/sms/send` | ✅ Yes |
| `POST /api/v1/email/send` | ✅ Yes |
| `POST /api/v1/data/purchase` | ✅ Yes |

### Idempotency Usage

Include the `idempotency_key` in your request body:

```bash
curl -X POST https://api.sendcomms.com/api/v1/sms/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+233540800994",
    "message": "Hello World",
    "idempotency_key": "unique-request-id-12345"
  }'
```

**Best Practices:**
- Use UUIDs or unique identifiers as idempotency keys
- Generate keys on the client side before making requests
- Store keys for retry scenarios
- Keys are scoped per customer and per service

### Idempotency Response Format

**First Request (processed):**
```json
{
  "success": true,
  "data": {
    "transaction_id": "sms_mjhw8xkw_6f97ab63ff91",
    "message_id": "SMf9c2ebdffd58b516f6895b02051c4b21",
    "status": "sent",
    "to": "+447555834656"
  }
}
```

**Duplicate Request (cached):**
```json
{
  "success": true,
  "data": {
    "transaction_id": "sms_mjhw8xkw_6f97ab63ff91",
    "message_id": "SMf9c2ebdffd58b516f6895b02051c4b21",
    "status": "sent",
    "to": "+447555834656"
  },
  "_idempotent": {
    "replayed": true,
    "message": "Duplicate request - returning cached response"
  }
}
```

**Headers on cached response:**
```
X-Idempotent-Replay: true
X-Idempotent-Cached-At: 2025-12-23T01:16:04.771Z
```

---

## Test Results

### Test Date: December 23, 2025

### SMS API Tests

**Rate Limiting Test:**
```
Request 1: ✅ Success (sent)
Request 2: ✅ Success (sent)
Request 3: ✅ Success (sent)
Request 4: ✅ Success (sent)
Request 5: ✅ Success (sent)
Request 6: ❌ Rate limited (429)
```

**Idempotency Test:**
```
First Request:  ✅ Processed (new transaction: sms_mjhw8xkw_6f97ab63ff91)
Second Request: ✅ Cached (same transaction_id, _idempotent.replayed: true)
```

### Email API Tests

**Idempotency Test:**
```
First Request:  ✅ Processed (new transaction: email_mjhw7819_166380bbe02b)
Second Request: ✅ Cached (same transaction_id, _idempotent.replayed: true)
```

### Data API Tests

**Rate Limiting Test:**
```
Request 1: ✅ Success (processing)
Request 2: ✅ Success (processing)
Request 3: ❌ Rate limited (429) - 2/min limit reached
```

**Idempotency Test:**
```
First Request:  ✅ Processed (new transaction: data_mjhw7md7_a8a05860a95c)
Second Request: ✅ Cached (same transaction_id, _idempotent.replayed: true)
```

---

## Architecture

### Rate Limiting Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   API       │────▶│   Redis     │
│   Request   │     │   Route     │     │   Check     │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                   │
                           │    ┌──────────────┘
                           │    │
                           ▼    ▼
                    ┌─────────────────┐
                    │  Rate Limit OK? │
                    └─────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │   Continue  │          │   Return    │
       │   Process   │          │   429 Error │
       └─────────────┘          └─────────────┘
```

### Idempotency Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Check     │────▶│   Redis     │
│   Request   │     │   Cache     │     │   Lookup    │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                   │
                           │    ┌──────────────┘
                           │    │
                           ▼    ▼
                    ┌─────────────────┐
                    │  Key Exists?    │
                    └─────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │   Acquire   │          │   Return    │
       │   Lock &    │          │   Cached    │
       │   Process   │          │   Response  │
       └─────────────┘          └─────────────┘
              │
              ▼
       ┌─────────────┐
       │   Store     │
       │   Response  │
       │   in Redis  │
       └─────────────┘
```

### Files Modified/Created

| File | Purpose |
|------|---------|
| `lib/idempotency/index.ts` | **NEW** - Redis idempotency library |
| `lib/rate-limit/index.ts` | Core rate limiting with Redis |
| `lib/rate-limit/middleware.ts` | Rate limit middleware helper |
| `app/api/v1/sms/send/route.ts` | Updated with Redis idempotency |
| `app/api/v1/email/send/route.ts` | Updated with Redis idempotency |
| `app/api/v1/data/purchase/route.ts` | **NEW** rate limiting + idempotency |

---

## Environment Variables

Ensure these are set for Redis functionality:

```env
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

---

## Summary

| Feature | Status | Technology |
|---------|--------|------------|
| Rate Limiting (SMS) | ✅ Active | Upstash Redis |
| Rate Limiting (Email) | ✅ Active | Upstash Redis |
| Rate Limiting (Data) | ✅ Active | Upstash Redis |
| Idempotency (SMS) | ✅ Active | Upstash Redis |
| Idempotency (Email) | ✅ Active | Upstash Redis |
| Idempotency (Data) | ✅ Active | Upstash Redis |

All services are now protected with both rate limiting and idempotency to ensure reliable, safe API operations.
