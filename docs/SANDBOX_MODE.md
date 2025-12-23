# Sandbox Mode Documentation

> **Last Tested**: December 23, 2025  
> **Test API Key**: `sc_test_s8kpk70a4zu49z7ikknkeqs4r5d7wqmhqm0hwcykgka5ap2c`  
> **All Tests**: ✅ Passed

## Overview

SendComms provides a sandbox mode that allows developers to test their integration without:
- Sending real messages (SMS, Email)
- Making real purchases (Data, Airtime)
- Incurring any charges
- Affecting production metrics

## API Key Types

| Key Type | Prefix | Behavior |
|----------|--------|----------|
| **Test** | `sc_test_` | Returns mock responses, no charges, no real messages sent |
| **Live** | `sc_live_` | Sends real messages, charges balance, affects production stats |

### Key Identification

```typescript
// Test key example
sc_test_abc123xyz789def456ghi012jkl345mno678pqr901stu234

// Live key example
sc_live_abc123xyz789def456ghi012jkl345mno678pqr901stu234
```

## Getting Test Keys

### Via Dashboard

1. Go to **Dashboard → API Keys**
2. Click **Create API Key**
3. Enter a name (e.g., "Development Test Key")
4. Toggle **Sandbox Mode** ON
5. Click **Create Key**
6. Copy and save your test key (starts with `sc_test_`)

### Key Features

Test keys provide:
- ✅ Full API validation (same as live)
- ✅ Realistic mock responses
- ✅ Transaction logging for debugging
- ✅ No balance deductions
- ✅ No real messages sent
- ✅ No real purchases made

## Sandbox Behavior by Service

### SMS (Test Mode)

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/sms/send \
  -H "Authorization: Bearer sc_test_s8kpk70a4zu49z7ikknkeqs4r5d7wqmhqm0hwcykgka5ap2c" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+233540800994",
    "message": "Hello from sandbox mode!"
  }'
```

**Response (Actual Test Result):**
```json
{
  "success": true,
  "data": {
    "transaction_id": "sms_test_mji01l2o_g8pamf65",
    "message_id": "SMtest1c7pkfx8z",
    "status": "sent",
    "to": "+233540800994",
    "from": "SendComms",
    "message_length": 24,
    "segments": 1,
    "price": {
      "amount": 0.029,
      "currency": "USD"
    },
    "provider": "sandbox",
    "country": {
      "code": "233",
      "name": "Ghana"
    },
    "region": "africa",
    "reference": null,
    "created_at": "2025-12-23T03:02:19.632Z",
    "_sandbox": {
      "mode": "test",
      "message": "This is a test transaction. No real SMS was sent.",
      "note": "Switch to a live API key (sc_live_) to send real messages."
    }
  }
}
```

**What happens:**
- ✅ Request is validated (phone format, message length, etc.)
- ✅ Mock response is returned
- ✅ Transaction is logged to `test_transactions` table
- ❌ No SMS is actually sent
- ❌ No balance is deducted

---

### Email (Test Mode)

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/email/send \
  -H "Authorization: Bearer sc_test_s8kpk70a4zu49z7ikknkeqs4r5d7wqmhqm0hwcykgka5ap2c" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "from": "noreply@sendcomms.com",
    "subject": "Test Email from Sandbox",
    "html": "<h1>Hello!</h1><p>This is a test email.</p>"
  }'
```

**Response (Actual Test Result):**
```json
{
  "success": true,
  "data": {
    "id": "email_test_mji01tqv_gavy9zdx",
    "email_id": "test_mji01tqv_sun4yfwn",
    "status": "sent",
    "to": ["test@example.com"],
    "from": "noreply@sendcomms.com",
    "subject": "Test Email from Sandbox",
    "recipients": 1,
    "provider": "sandbox",
    "cost": 0.001,
    "currency": "USD",
    "created_at": "2025-12-23T03:02:30.871Z",
    "_sandbox": {
      "mode": "test",
      "message": "This is a test transaction. No real email was sent.",
      "note": "Switch to a live API key (sc_live_) to send real messages."
    }
  }
}
```

**What happens:**
- ✅ Request is validated (email format, required fields, etc.)
- ✅ Mock response is returned
- ✅ Transaction is logged
- ❌ No email is actually sent
- ❌ No balance is deducted

---

### Data Bundle (Test Mode)

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/data/purchase \
  -H "Authorization: Bearer sc_test_s8kpk70a4zu49z7ikknkeqs4r5d7wqmhqm0hwcykgka5ap2c" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "0248687065",
    "network": "mtn",
    "capacity_gb": 2
  }'
```

**Response (Actual Test Result):**
```json
{
  "success": true,
  "data": {
    "transaction_id": "data_test_mji0202b_iqy9ucoe",
    "status": "completed",
    "phone_number": "0248687065",
    "network": "mtn",
    "capacity_gb": 2,
    "price": {
      "amount": 9,
      "currency": "GHS"
    },
    "provider": "sandbox",
    "provider_reference": "TRX-TEST-mji0202b_kpt3qnth",
    "order_reference": "TEST-XN9245V3",
    "processing_method": "instant",
    "message": "Test mode: Data bundle order simulated successfully.",
    "created_at": "2025-12-23T03:02:39.059Z",
    "_sandbox": {
      "mode": "test",
      "message": "This is a test transaction. No real data bundle was purchased.",
      "note": "Switch to a live API key (sc_live_) to send real messages."
    }
  }
}
```

**What happens:**
- ✅ Request is validated (phone format, network, capacity)
- ✅ Mock response with realistic pricing
- ✅ Transaction is logged
- ❌ No data bundle is purchased
- ❌ No balance is deducted

---

### Batch Email (Test Mode)

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/email/batch \
  -H "Authorization: Bearer sc_test_s8kpk70a4zu49z7ikknkeqs4r5d7wqmhqm0hwcykgka5ap2c" \
  -H "Content-Type: application/json" \
  -d '{
    "emails": [
      {"to": "user1@example.com", "subject": "Hello User 1", "html": "<h1>Hello!</h1>"},
      {"to": "user2@example.com", "subject": "Hello User 2", "html": "<h1>Hello!</h1>"},
      {"to": "user3@example.com", "subject": "Hello User 3", "html": "<h1>Hello!</h1>"}
    ]
  }'
```

**Response (Actual Test Result):**
```json
{
  "success": true,
  "data": {
    "batch_id": "batch_test_mji03bdk_sqecx11t",
    "status": "completed",
    "total_emails": 3,
    "total_recipients": 3,
    "successful": 3,
    "failed": 0,
    "provider": "sandbox",
    "cost": 0.003,
    "currency": "USD",
    "results": [
      {"index": 0, "email_id": "test_mji03bdk_p3yti899", "status": "sent", "to": "user1@example.com", "subject": "Hello User 1"},
      {"index": 1, "email_id": "test_mji03bdk_fq4l4ynp", "status": "sent", "to": "user2@example.com", "subject": "Hello User 2"},
      {"index": 2, "email_id": "test_mji03bdk_ab3cr40y", "status": "sent", "to": "user3@example.com", "subject": "Hello User 3"}
    ],
    "created_at": "2025-12-23T03:03:40.376Z",
    "_sandbox": {
      "mode": "test",
      "message": "This is a test transaction. No real email was sent.",
      "note": "Switch to a live API key (sc_live_) to send real messages."
    }
  }
}
```

---

### SMS Regional Pricing (Test Mode)

Sandbox mode returns accurate regional pricing based on the phone number's country code.

**US Number (+1):**
```json
{
  "price": {"amount": 0.012, "currency": "USD"},
  "country": {"code": "1", "name": "United States"},
  "region": "north_america"
}
```

**UK Number (+44):**
```json
{
  "price": {"amount": 0.046, "currency": "USD"},
  "country": {"code": "44", "name": "United Kingdom"},
  "region": "europe"
}
```

**Ghana Number (+233):**
```json
{
  "price": {"amount": 0.029, "currency": "USD"},
  "country": {"code": "233", "name": "Ghana"},
  "region": "africa"
}
```

---

## Detecting Sandbox Responses

All sandbox responses include a `_sandbox` object:

```json
{
  "_sandbox": {
    "mode": "test",
    "message": "This is a test transaction. No real SMS was sent.",
    "note": "Switch to a live API key (sc_live_) to send real messages."
  }
}
```

**In your code:**
```javascript
const response = await sendSMS({ to, message });

if (response.data._sandbox) {
  console.log('⚠️ Running in sandbox mode');
  console.log(response.data._sandbox.message);
}
```

---

## Switching to Production

When you're ready to go live:

1. **Create a live key** in Dashboard → API Keys (toggle Sandbox Mode OFF)
2. **Update your environment:**
   ```env
   # Development
   SENDCOMMS_API_KEY=sc_test_xxx
   
   # Production
   SENDCOMMS_API_KEY=sc_live_xxx
   ```
3. **Ensure sufficient balance** - Live requests will charge your account

**Example environment switching:**
```javascript
const apiKey = process.env.NODE_ENV === 'production'
  ? process.env.SENDCOMMS_LIVE_KEY
  : process.env.SENDCOMMS_TEST_KEY;
```

---

## Test Transactions Table

All sandbox transactions are logged for debugging:

```sql
SELECT * FROM test_transactions 
WHERE customer_id = 'your-customer-id'
ORDER BY created_at DESC
LIMIT 10;
```

**Table Schema:**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Unique ID |
| customer_id | UUID | Your customer ID |
| service | TEXT | sms, email, data, airtime |
| endpoint | TEXT | API endpoint called |
| transaction_id | TEXT | Mock transaction ID |
| request_body | JSONB | Original request |
| response_body | JSONB | Mock response |
| created_at | TIMESTAMP | When the test was made |

---

## Validation in Sandbox Mode

Sandbox mode performs **full validation** just like live mode:

| Validation | Sandbox | Live |
|------------|---------|------|
| API key authentication | ✅ | ✅ |
| Rate limiting | ✅ | ✅ |
| Phone number format | ✅ | ✅ |
| Email format | ✅ | ✅ |
| Required fields | ✅ | ✅ |
| Message length | ✅ | ✅ |
| Network validation | ✅ | ✅ |
| Balance check | ❌ | ✅ |
| Actual sending | ❌ | ✅ |

This means if your request works in sandbox mode, it will work in production (assuming sufficient balance).

---

## Error Handling in Sandbox

Errors are returned the same way in both modes:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PHONE_NUMBER",
    "message": "Invalid phone number. Use E.164 format (e.g., +233540800994)",
    "docs_url": "https://docs.sendcomms.com/docs/errors#client-error-codes"
  }
}
```

---

## Best Practices

### 1. Use Separate Keys for Each Environment

```env
# .env.development
SENDCOMMS_API_KEY=sc_test_xxx

# .env.production  
SENDCOMMS_API_KEY=sc_live_xxx
```

### 2. Check for Sandbox Mode in Logs

```javascript
async function sendMessage(params) {
  const response = await api.post('/sms/send', params);
  
  if (response.data._sandbox) {
    logger.warn('Message sent in SANDBOX mode - not delivered');
  } else {
    logger.info('Message sent successfully');
  }
  
  return response;
}
```

### 3. Don't Use Test Keys in Production

Add a startup check:

```javascript
if (process.env.NODE_ENV === 'production') {
  if (process.env.SENDCOMMS_API_KEY?.startsWith('sc_test_')) {
    throw new Error('Cannot use test API key in production!');
  }
}
```

### 4. Test All Scenarios

- ✅ Test successful sends
- ✅ Test validation errors (invalid phone, email, etc.)
- ✅ Test rate limiting
- ✅ Test with different regions/networks

---

## FAQ

### Q: Do test transactions count toward rate limits?
**A:** Yes, rate limits apply to both test and live keys.

### Q: Can I test webhooks in sandbox mode?
**A:** Yes, webhooks are triggered for test transactions but with `_sandbox` flag.

### Q: Is there a test balance limit?
**A:** No, sandbox mode doesn't check or deduct balance.

### Q: Are test transactions visible in the dashboard?
**A:** Yes, they appear in the test transactions section.

### Q: Can I convert a test key to live?
**A:** No, you need to create a new live key. Keys cannot be converted.

---

## Support

Having issues with sandbox mode?

- 📧 Email: support@sendcomms.com
- 📚 Docs: https://docs.sendcomms.com
- 💬 Discord: https://discord.gg/sendcomms

---

## Test Results Summary

The following tests were run on **December 23, 2025** with test key `sc_test_s8kpk70a4zu49z7ikknkeqs4r5d7wqmhqm0hwcykgka5ap2c`:

| Test | Endpoint | Status | Notes |
|------|----------|--------|-------|
| SMS - Ghana (+233) | `/api/v1/sms/send` | ✅ Passed | Price: $0.029 |
| SMS - US (+1) | `/api/v1/sms/send` | ✅ Passed | Price: $0.012 |
| SMS - UK (+44) | `/api/v1/sms/send` | ✅ Passed | Price: $0.046 |
| Email - Single | `/api/v1/email/send` | ✅ Passed | Price: $0.001 |
| Email - Batch (3) | `/api/v1/email/batch` | ✅ Passed | Price: $0.003 |
| Data - MTN 2GB | `/api/v1/data/purchase` | ✅ Passed | Price: GHS 9.00 |
| Data - Vodafone 5GB | `/api/v1/data/purchase` | ✅ Passed | Price: GHS 21.00 |
| Data - AirtelTigo 1GB | `/api/v1/data/purchase` | ✅ Passed | Price: GHS 4.00 |
| Validation - Invalid Phone | `/api/v1/sms/send` | ✅ Passed | Error: INVALID_PHONE_NUMBER |
| Validation - Missing Field | `/api/v1/sms/send` | ✅ Passed | Error: MISSING_FIELD |
| Validation - Missing Content | `/api/v1/email/send` | ✅ Passed | Error: MISSING_CONTENT |

**All tests confirm:**
- ✅ Mock responses include `_sandbox` metadata
- ✅ No real messages sent
- ✅ No balance deductions
- ✅ Validation errors work identically to live mode
- ✅ Regional pricing is accurate
