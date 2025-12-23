# Error Handling & Escalation System

## Overview

SendComms uses a sophisticated error handling system designed to:

1. **Protect Customer Experience** - Never expose provider-specific errors to customers
2. **Enable Fast Response** - Escalate critical issues immediately via SMS & Email
3. **Maintain Audit Trail** - Log all errors for debugging and analysis
4. **Ensure Reliability** - Classify errors by severity and retryability

## Error Classification System

### 1. Customer Errors (Safe to Show)

These errors are caused by the customer and can be safely returned with detailed information:

| Error | Code | HTTP Status | Example |
|-------|------|-------------|---------|
| Insufficient Balance | `INSUFFICIENT_BALANCE` | 402 | Customer needs to add funds |
| Invalid Phone Number | `INVALID_PHONE_NUMBER` | 400 | Wrong format for phone number |
| Invalid Email | `INVALID_EMAIL` | 400 | Malformed email address |
| Message Too Long | `MESSAGE_TOO_LONG` | 400 | SMS exceeds 1600 characters |
| Rate Limit Exceeded | `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| Invalid API Key | `UNAUTHORIZED` | 401 | Missing or invalid API key |
| Account Suspended | `ACCOUNT_SUSPENDED` | 403 | Customer account disabled |
| Missing Field | `MISSING_FIELD` | 400 | Required parameter not provided |

**Customer Error Response Example:**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance. Required: $0.0350, Available: $0.0100",
    "details": {
      "required": 0.035,
      "available": 0.01
    }
  }
}
```

### 2. Provider Errors (Hidden from Customer + Escalated)

These errors originate from external service providers (Twilio, Resend, DataMart, etc.) and must NEVER be exposed to customers:

| Error Type | Example | Severity | Action |
|------------|---------|----------|--------|
| Wallet Depleted | "DataMart wallet empty" | Critical | Escalate + Top up required |
| API Key Invalid | "Twilio authentication failed" | Critical | Escalate + Fix credentials |
| Account Suspended | "Resend account disabled" | Critical | Escalate + Contact provider |
| Rate Limited | "Provider rate limit exceeded" | High | Escalate + Wait |
| Service Down | "Termii timeout" | High | Escalate + Retry later |
| Network Issue | "Connection failed" | High | Auto-retry if possible |

**Provider Error Response to Customer (Sanitized):**
```json
{
  "success": false,
  "error": {
    "code": "SMS_SEND_FAILED",
    "message": "Failed to send SMS. Please try again in a few minutes."
  }
}
```

### 3. System Errors (Hidden from Customer + Escalated)

Internal errors from our infrastructure:

| Error Type | Example | Severity |
|------------|---------|----------|
| Database Error | "Supabase connection failed" | Critical |
| Redis Error | "Redis timeout" | Critical |
| Configuration | "Missing environment variable" | Critical |
| Unexpected | "Unhandled exception" | Critical |

**System Error Response to Customer:**
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred. Please try again later."
  }
}
```

## Architecture

### File Structure

```
lib/
├── errors/
│   ├── index.ts          # Main exports
│   ├── handler.ts        # Error handler & classification
│   └── providers.ts      # Provider-specific error mappers
├── escalation/
│   └── index.ts          # SMS & Email escalation
└── ...
```

### Error Flow

```
API Request
    │
    ▼
┌─────────────┐
│ Try Block   │
└──────┬──────┘
       │
       ▼ (error occurs)
┌─────────────────────────────┐
│ Is it a CustomerError?      │─────Yes────► Return to customer
└──────────────┬──────────────┘              with full details
               │ No
               ▼
┌─────────────────────────────┐
│ Map to ProviderError        │
│ (mapTwilioError, etc.)      │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ handleProviderError()       │
│  - Log to console           │
│  - Save to database         │
│  - Check severity           │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Severity Critical/High?     │─────Yes────► Escalate
└──────────────┬──────────────┘              │
               │ No                          │
               │◄────────────────────────────┘
               ▼
┌─────────────────────────────┐
│ Return sanitized message    │
│ to customer                 │
└─────────────────────────────┘
```

## Error Handler Usage

### Basic Usage

```typescript
import { 
  handleProviderError,
  ProviderError,
  CustomerErrors,
  isCustomerError 
} from '@/lib/errors';
import { mapTwilioError } from '@/lib/errors/providers';

// In your API route
try {
  // ... business logic
  const result = await sendViaTwilio(to, message);
  
  if (!result.success) {
    // Check if this is a provider issue
    const providerError = mapTwilioError({ message: result.error });
    
    await handleProviderError(
      {
        service: 'sms',
        provider: 'twilio',
        customer_id: customerId,
        transaction_id: transactionId,
        request: { to, message },
        error: { message: result.error }
      },
      providerError
    );
    
    // Return generic message
    return errorResponse(
      'Failed to send SMS. Please try again.',
      503,
      'SMS_SEND_FAILED'
    );
  }
  
} catch (error) {
  // Handle customer errors (show to user)
  if (isCustomerError(error)) {
    return errorResponse(
      error.message,
      error.httpStatus,
      error.code
    );
  }
  
  // Handle provider/system errors (hide from user)
  const providerError = mapTwilioError(error);
  const result = await handleProviderError(context, providerError);
  
  return errorResponse(
    result.customerMessage,
    result.httpStatus,
    result.customerCode
  );
}
```

### Throwing Customer Errors

```typescript
import { CustomerErrors } from '@/lib/errors';

// These will be caught and returned to the customer
if (balance < requiredAmount) {
  throw CustomerErrors.insufficientBalance(requiredAmount, balance);
}

if (!isValidPhone(phone)) {
  throw CustomerErrors.invalidPhoneNumber(phone);
}

if (message.length > 1600) {
  throw CustomerErrors.messageTooLong(message.length, 1600);
}
```

### Creating Custom Provider Errors

```typescript
import { ProviderError } from '@/lib/errors';

// For new providers, create a mapper
export function mapNewProviderError(error: any): ProviderError {
  const message = error.message || '';
  
  if (message.includes('balance')) {
    return new ProviderError(
      'NewProvider wallet depleted',
      'newprovider',
      error,
      'critical',  // severity
      false        // retryable
    );
  }
  
  return new ProviderError(
    `NewProvider error: ${message}`,
    'newprovider',
    error,
    'medium',
    false
  );
}
```

## Escalation System

### Channels

1. **SMS** - Sent to admin phone number for immediate attention
2. **Email** - Detailed HTML email with full error context

### Configuration

```env
# Admin Notification Settings
ADMIN_PHONE=+447555834656
ADMIN_EMAILS=angeloasante958@gmail.com,travis@travisdevelops.com
ALERT_FROM_EMAIL=alerts@sendcomms.com

# Provider credentials (for escalation)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_NUMBER=...
RESEND_API_KEY=...
```

### Escalation Triggers

| Severity | Escalate? | Channels |
|----------|-----------|----------|
| Critical | Yes | SMS + Email |
| High | Yes | SMS + Email |
| Medium | No | Logged only |
| Low | No | Logged only |

### SMS Alert Format

```
🚨 CRITICAL ALERT

Service: sms
Provider: twilio
Error: Twilio account balance depleted

Customer: a1b2c3d4...
Error ID: err_m1abc123_xyz789

Check dashboard for details.
```

### Email Alert Format

The email includes:
- Severity badge with color coding
- Service and provider identification
- Timestamp
- Error ID for reference
- Full error details
- Request data (sanitized)
- Original error object
- Action checklist

## Database Schema

### provider_errors Table

```sql
CREATE TABLE provider_errors (
  id TEXT PRIMARY KEY,                    -- err_{timestamp}_{random}
  service TEXT NOT NULL,                  -- email, sms, data, airtime
  provider TEXT NOT NULL,                 -- twilio, resend, datamart, etc.
  customer_id UUID REFERENCES customers,
  transaction_id TEXT,
  error_type TEXT NOT NULL,               -- ProviderError, SystemError
  error_message TEXT NOT NULL,
  error_details JSONB,
  severity TEXT NOT NULL,                 -- low, medium, high, critical
  retryable BOOLEAN DEFAULT false,
  request_data JSONB,
  escalated BOOLEAN DEFAULT false,
  escalated_at TIMESTAMPTZ,
  escalation_channels TEXT[],
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolution_notes TEXT,
  resolution_action TEXT,                 -- retry, refund, ignore
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Useful Queries

```sql
-- Get all unresolved critical errors
SELECT * FROM provider_errors 
WHERE resolved = false AND severity = 'critical'
ORDER BY created_at DESC;

-- Error counts by provider (last 24h)
SELECT provider, severity, COUNT(*) 
FROM provider_errors 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY provider, severity
ORDER BY COUNT(*) DESC;

-- Service health overview
SELECT 
  service,
  COUNT(*) as total_errors,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical,
  COUNT(*) FILTER (WHERE severity = 'high') as high
FROM provider_errors 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY service;

-- Provider uptime analysis
SELECT 
  provider,
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as error_count
FROM provider_errors
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY provider, hour
ORDER BY hour DESC;
```

## Provider Error Mappers

### Supported Providers

| Provider | Service | Mapper Function |
|----------|---------|-----------------|
| Twilio | SMS | `mapTwilioError()` |
| Termii | SMS | `mapTermiiError()` |
| Hubtel | SMS (Ghana) | `mapHubtelError()` |
| Resend | Email | `mapResendError()` |
| DataMart | Data Bundles | `mapDataMartError()` |
| Reloadly | Data/Airtime | `mapReloadlyError()` |

### Adding New Providers

1. Add mapper to `lib/errors/providers.ts`
2. Export from `lib/errors/index.ts`
3. Import in relevant API routes

```typescript
// lib/errors/providers.ts
export function mapNewProviderError(error: unknown): ProviderError {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);
  
  // Map known error patterns to severity levels
  if (message.includes('balance') || code === 'INSUFFICIENT_FUNDS') {
    return new ProviderError(
      'NewProvider wallet depleted',
      'newprovider',
      error,
      'critical',
      false
    );
  }
  
  // ... more mappings
  
  return new ProviderError(
    `NewProvider error: ${message}`,
    'newprovider',
    error,
    'medium',
    false
  );
}
```

## Best Practices

### 1. Never Expose Provider Details

❌ Bad:
```json
{
  "error": "Twilio error 20003: Authentication failed"
}
```

✅ Good:
```json
{
  "error": {
    "code": "SMS_SEND_FAILED",
    "message": "Failed to send SMS. Please try again."
  }
}
```

### 2. Always Include Transaction IDs

```json
{
  "error": {
    "code": "EMAIL_SEND_FAILED",
    "message": "Failed to send email.",
    "transaction_id": "txn_email_abc123"
  }
}
```

### 3. Log Before Responding

```typescript
// Log full details first
await handleProviderError(context, providerError);

// Then return sanitized response
return errorResponse(customerMessage, 503, customerCode);
```

### 4. Don't Block on Escalation

```typescript
// Fire and forget - don't block customer response
escalateError(context, error, errorId).catch(escError => {
  console.error('[Escalation Failed]', escError);
});

// Continue with response
return errorResponse(...);
```

### 5. Sanitize Logged Data

The error handler automatically redacts:
- `password`
- `api_key` / `apiKey`
- `secret`
- `token`
- `authorization`

## Monitoring & Dashboards

### Recommended Alerts

1. **Critical Error Rate** - Alert if > 5 critical errors in 15 minutes
2. **Provider Down** - Alert if > 10 errors from same provider in 5 minutes
3. **Unresolved Errors** - Daily report of unresolved critical/high errors

### Key Metrics

- Error rate by service
- Error rate by provider
- Mean time to resolution
- Escalation rate
- Customer-facing error rate

## Testing

### Test Scenarios

1. **Customer Error Flow**
   - Send request with invalid phone number
   - Verify customer-friendly error returned
   - Verify no escalation triggered

2. **Provider Error Flow**
   - Simulate Twilio authentication failure
   - Verify generic error returned to customer
   - Verify escalation SMS/Email sent
   - Verify error logged to database

3. **System Error Flow**
   - Simulate database connection failure
   - Verify 500 error returned
   - Verify escalation triggered

### Manual Testing

```bash
# Test with invalid API key (customer error)
curl -X POST https://api.sendcomms.com/api/v1/sms/send \
  -H "Authorization: Bearer invalid_key"

# Expected: 401 Unauthorized (no escalation)

# Test with simulated provider error
# (Requires test endpoint or mocked provider)
```

## Changelog

- **v1.0.0** - Initial implementation
  - Error handler with classification
  - SMS & Email escalation
  - Provider mappers for Twilio, Termii, Hubtel, Resend, DataMart, Reloadly
  - Database schema for error tracking
