# 🎉 SendComms API - Setup Complete!

## ✅ What's Working

### Email API
- **Single Send Endpoint**: `POST /api/v1/email/send`
- **Batch Send Endpoint**: `POST /api/v1/email/batch`
- **Status**: ✅ Fully functional

### Webhook API
- **Register Webhook**: `POST /api/v1/webhooks`
- **List Webhooks**: `GET /api/v1/webhooks`
- **Delete Webhook**: `DELETE /api/v1/webhooks?id=xxx`
- **Status**: ✅ Fully functional

### Complete API Summary

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/api/v1/email/send` | POST | Send single email | ✅ Live |
| `/api/v1/email/batch` | POST | Send up to 100 emails | ✅ Live |
| `/api/v1/webhooks` | POST | Register webhook URL | ✅ Live |
| `/api/v1/webhooks` | GET | List your webhooks | ✅ Live |
| `/api/v1/webhooks?id=xxx` | DELETE | Delete a webhook | ✅ Live |
| `/api/v1/sms/send` | POST | Send SMS | 🔜 Coming |
| `/api/v1/airtime/purchase` | POST | Buy airtime | 🔜 Coming |
| `/api/v1/data/purchase` | POST | Buy data bundles | 🔜 Coming |

### Test Results

#### Single Email Test ✅
- **Recipient**: angeloasante958@gmail.com
- **Status**: Sent successfully
- **Email ID**: Confirmed delivery

#### Batch Email Test ✅
- **Batch ID**: `batch_mjgc0ejr_3ca715bfb7a0`
- **Emails Sent**: 4
- **Total Recipients**: 4
- **Cost**: $0.04
- **Status**: All sent successfully
- **Email IDs**:
  - `c8d85828-5f27-4ce9-aa86-6ee58b8070a4`
  - `69b0b450-959e-4547-b302-d3a710c76584`
  - `b6e876e5-01e8-4d25-9ebc-c724d881052a`
  - `ba00378e-8b31-4288-9ba7-1a222e763518`

#### Webhook Registration Test ✅
- **Webhook ID**: `e406c83c-50bc-4783-b5fc-4beafe6bf5eb`
- **URL**: `https://webhook.site/test-endpoint-123`
- **Events**: `email.sent`, `email.delivered`, `email.bounced`
- **Status**: Registered successfully

### Your API Key
```
ac_live_8be6e26c12a5584f090116b9c52c3814c376c4318125e668
```
> ⚠️ Keep this secure! Don't share publicly.

### Your Account
- **Email**: admin@sendcomms.com
- **Balance**: $99.95 (after tests)
- **Plan**: Enterprise

---

## 🔑 API Key System

### How API Keys Are Created

SendComms uses a secure API key system for authentication:

1. **Key Generation**: API keys are generated using `crypto.randomBytes()` with 32 bytes of entropy
2. **Key Format**: `ac_live_` prefix + 48-character hex string (e.g., `ac_live_8be6e26c...`)
3. **Storage**: Only the SHA-256 hash of the key is stored in the database (never the raw key)
4. **Validation**: On each request, the provided key is hashed and compared against stored hashes

### Key Components

| Component | Description |
|-----------|-------------|
| **Prefix** | `ac_live_` for production, `ac_test_` for testing |
| **Hash Algorithm** | SHA-256 |
| **Key Length** | 56 characters total (8 prefix + 48 hex) |
| **Storage** | Supabase PostgreSQL `api_keys` table |

### Database Schema

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  key_hash VARCHAR(64) NOT NULL,  -- SHA-256 hash
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Creating a New API Key

To create a new customer with API key:

```bash
# 1. Create a customer
curl -X POST http://localhost:3000/api/admin/customers \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "name": "Customer Name",
    "plan": "pro"
  }'

# Response includes the API key (shown once, never stored)
{
  "customer": { ... },
  "api_key": "ac_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

### Key Validation Flow

```
Client Request → Extract API Key from Header
                         ↓
                 Hash the API Key (SHA-256)
                         ↓
                 Query database for matching hash
                         ↓
                 Check: is_active = true?
                         ↓
                 Check: customer.is_active = true?
                         ↓
                 Update last_used_at timestamp
                         ↓
                 ✅ Request proceeds
```

### Required Environment Variables

```bash
# Supabase (Database)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Resend (Email)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Termii (SMS) - Coming Soon
TERMII_API_KEY=your_termii_key

# Reloadly (Airtime/Data) - Coming Soon
RELOADLY_CLIENT_ID=your_client_id
RELOADLY_CLIENT_SECRET=your_client_secret
```

---

## 📧 How to Send a Single Email

### Using cURL
```bash
curl -X POST https://your-domain.com/api/v1/email/send \
  -H "Authorization: Bearer ac_live_8be6e26c12a5584f090116b9c52c3814c376c4318125e668" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Hello from SendComms!",
    "html": "<h1>Welcome!</h1><p>This is your email content.</p>",
    "from": "Your Name <onboarding@resend.dev>"
  }'
```

### Using JavaScript/Node.js
```javascript
const response = await fetch('https://your-domain.com/api/v1/email/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ac_live_8be6e26c12a5584f090116b9c52c3814c376c4318125e668',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: 'recipient@example.com',
    subject: 'Hello from SendComms!',
    html: '<h1>Welcome!</h1><p>This is your email content.</p>',
    from: 'Your Name <onboarding@resend.dev>'
  })
});

const result = await response.json();
console.log(result);
```

### Using Python
```python
import requests

response = requests.post(
    'https://your-domain.com/api/v1/email/send',
    headers={
        'Authorization': 'Bearer ac_live_8be6e26c12a5584f090116b9c52c3814c376c4318125e668',
        'Content-Type': 'application/json'
    },
    json={
        'to': 'recipient@example.com',
        'subject': 'Hello from SendComms!',
        'html': '<h1>Welcome!</h1><p>This is your email content.</p>',
        'from': 'Your Name <onboarding@resend.dev>'
    }
)

print(response.json())
```

### Using PHP
```php
<?php
$curl = curl_init();

curl_setopt_array($curl, [
    CURLOPT_URL => 'https://your-domain.com/api/v1/email/send',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ac_live_8be6e26c12a5584f090116b9c52c3814c376c4318125e668',
        'Content-Type: application/json'
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'to' => 'recipient@example.com',
        'subject' => 'Hello from SendComms!',
        'html' => '<h1>Welcome!</h1><p>This is your email content.</p>',
        'from' => 'Your Name <onboarding@resend.dev>'
    ])
]);

$response = curl_exec($curl);
curl_close($curl);

print_r(json_decode($response, true));
?>
```

---

## 📬 How to Send Batch Emails

Send up to 100 emails in a single API call.

### Using cURL
```bash
curl -X POST https://your-domain.com/api/v1/email/batch \
  -H "Authorization: Bearer ac_live_8be6e26c12a5584f090116b9c52c3814c376c4318125e668" \
  -H "Content-Type: application/json" \
  -d '{
    "emails": [
      {
        "to": "user1@example.com",
        "subject": "Welcome User 1",
        "html": "<h1>Hello User 1!</h1>"
      },
      {
        "to": "user2@example.com",
        "subject": "Welcome User 2",
        "html": "<h1>Hello User 2!</h1>"
      }
    ]
  }'
```

### Using JavaScript/Node.js
```javascript
const response = await fetch('https://your-domain.com/api/v1/email/batch', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ac_live_8be6e26c12a5584f090116b9c52c3814c376c4318125e668',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    emails: [
      {
        to: 'user1@example.com',
        subject: 'Welcome User 1',
        html: '<h1>Hello User 1!</h1>'
      },
      {
        to: 'user2@example.com',
        subject: 'Welcome User 2',
        html: '<h1>Hello User 2!</h1>'
      }
    ]
  })
});

const result = await response.json();
console.log(result);
```

### Using Python
```python
import requests

response = requests.post(
    'https://your-domain.com/api/v1/email/batch',
    headers={
        'Authorization': 'Bearer ac_live_8be6e26c12a5584f090116b9c52c3814c376c4318125e668',
        'Content-Type': 'application/json'
    },
    json={
        'emails': [
            {
                'to': 'user1@example.com',
                'subject': 'Welcome User 1',
                'html': '<h1>Hello User 1!</h1>'
            },
            {
                'to': 'user2@example.com',
                'subject': 'Welcome User 2',
                'html': '<h1>Hello User 2!</h1>'
            }
        ]
    }
)

print(response.json())
```

### Using PHP
```php
<?php
$curl = curl_init();

curl_setopt_array($curl, [
    CURLOPT_URL => 'https://your-domain.com/api/v1/email/batch',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ac_live_8be6e26c12a5584f090116b9c52c3814c376c4318125e668',
        'Content-Type: application/json'
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'emails' => [
            [
                'to' => 'user1@example.com',
                'subject' => 'Welcome User 1',
                'html' => '<h1>Hello User 1!</h1>'
            ],
            [
                'to' => 'user2@example.com',
                'subject' => 'Welcome User 2',
                'html' => '<h1>Hello User 2!</h1>'
            ]
        ]
    ])
]);

$response = curl_exec($curl);
curl_close($curl);

print_r(json_decode($response, true));
?>
```

---

## � Webhooks - Real-Time Event Notifications

SendComms sends real-time notifications to your server when email events occur. This allows you to track delivery status, handle bounces, and build responsive notification systems.

### Webhook Flow

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐      ┌─────────────┐
│   Your App  │─────▶│  SendComms │─────▶│    Resend    │─────▶│  Recipient  │
│  Send Email │      │     API      │      │   Provider   │      │    Inbox    │
└─────────────┘      └──────────────┘      └──────────────┘      └─────────────┘
                                                  │
                                                  │ Event (delivered/bounced/etc)
                                                  ▼
                     ┌──────────────┐      ┌──────────────┐
                     │  Your Server │◀─────│  SendComms │
                     │   Webhook    │      │   Forward    │
                     └──────────────┘      └──────────────┘
```

### Step 1: Register Your Webhook Endpoint

#### Using cURL
```bash
curl -X POST https://your-domain.com/api/v1/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhooks/sendcomms",
    "events": ["email.sent", "email.delivered", "email.bounced", "email.opened"]
  }'
```

#### Using JavaScript/Node.js
```javascript
const response = await fetch('https://your-domain.com/api/v1/webhooks', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://your-server.com/webhooks/sendcomms',
    events: ['email.sent', 'email.delivered', 'email.bounced', 'email.opened']
  })
});

const result = await response.json();
// Save the secret! It's only shown once
console.log('Webhook secret:', result.data.secret);
```

#### Using Python
```python
import requests

response = requests.post(
    'https://your-domain.com/api/v1/webhooks',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'url': 'https://your-server.com/webhooks/sendcomms',
        'events': ['email.sent', 'email.delivered', 'email.bounced', 'email.opened']
    }
)

result = response.json()
# Save the secret! It's only shown once
print('Webhook secret:', result['data']['secret'])
```

### Step 2: Webhook Registration Response

```json
{
  "success": true,
  "data": {
    "id": "e406c83c-50bc-4783-b5fc-4beafe6bf5eb",
    "url": "https://your-server.com/webhooks/sendcomms",
    "events": ["email.sent", "email.delivered", "email.bounced", "email.opened"],
    "secret": "whsec_21be983f359112f9e07658ed2bddcee3062699a6ab70b092",
    "active": true,
    "created_at": "2025-12-21T23:25:12.006Z"
  }
}
```

> ⚠️ **IMPORTANT**: Save the `secret` immediately! It's only shown once during registration. You'll need it to verify webhook signatures.

### Step 3: Build Your Webhook Handler

Your server needs to:
1. Receive POST requests from SendComms
2. Verify the signature using HMAC-SHA256
3. Process the event
4. Return 200 OK quickly

#### Node.js/Express Example
```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const WEBHOOK_SECRET = 'whsec_21be983f...'; // Your saved secret

app.post('/webhooks/sendcomms', (req, res) => {
  // 1. Get the signature from headers
  const signature = req.headers['x-sendcomms-signature'];
  
  // 2. Verify the signature
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  if (signature !== expectedSignature) {
    console.error('Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // 3. Process the event
  const { event, data, transaction_id, timestamp } = req.body;
  
  switch (event) {
    case 'email.sent':
      console.log(`Email ${data.id} sent to ${data.to}`);
      // Update your database, notify user, etc.
      break;
      
    case 'email.delivered':
      console.log(`Email ${data.id} delivered to ${data.to}`);
      break;
      
    case 'email.bounced':
      console.log(`Email ${data.id} bounced: ${data.bounce_message}`);
      // Mark email as invalid in your system
      break;
      
    case 'email.opened':
      console.log(`Email ${data.id} opened at ${data.opened_at}`);
      break;
      
    case 'email.clicked':
      console.log(`Link clicked: ${data.clicked_link}`);
      break;
      
    default:
      console.log('Unknown event:', event);
  }
  
  // 4. Return 200 quickly
  res.status(200).json({ received: true });
});

app.listen(3001, () => console.log('Webhook server running on port 3001'));
```

#### Python/Flask Example
```python
from flask import Flask, request, jsonify
import hmac
import hashlib
import json

app = Flask(__name__)

WEBHOOK_SECRET = 'whsec_21be983f...'  # Your saved secret

@app.route('/webhooks/sendcomms', methods=['POST'])
def handle_webhook():
    # 1. Get the signature from headers
    signature = request.headers.get('X-SendComms-Signature', '')
    
    # 2. Verify the signature
    expected_signature = 'sha256=' + hmac.new(
        WEBHOOK_SECRET.encode(),
        json.dumps(request.json).encode(),
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(signature, expected_signature):
        return jsonify({'error': 'Invalid signature'}), 401
    
    # 3. Process the event
    data = request.json
    event = data.get('event')
    
    if event == 'email.delivered':
        print(f"Email delivered to {data['data']['to']}")
        # Update your database
    elif event == 'email.bounced':
        print(f"Email bounced: {data['data'].get('bounce_message')}")
        # Mark email as invalid
    
    # 4. Return 200 quickly
    return jsonify({'received': True}), 200

if __name__ == '__main__':
    app.run(port=3001)
```

#### PHP Example
```php
<?php
$webhookSecret = 'whsec_21be983f...'; // Your saved secret

// Get raw body for signature verification
$rawBody = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_SENDCOMMS_SIGNATURE'] ?? '';

// Verify signature
$expectedSignature = 'sha256=' . hash_hmac('sha256', $rawBody, $webhookSecret);

if (!hash_equals($expectedSignature, $signature)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

// Parse the webhook payload
$data = json_decode($rawBody, true);
$event = $data['event'];

switch ($event) {
    case 'email.delivered':
        // Update delivery status in your database
        error_log("Email delivered to: " . $data['data']['to']);
        break;
        
    case 'email.bounced':
        // Mark email as invalid
        error_log("Email bounced: " . $data['data']['bounce_message']);
        break;
}

// Return 200 OK
http_response_code(200);
echo json_encode(['received' => true]);
```

### Webhook Payload Format

Every webhook payload follows this structure:

```json
{
  "event": "email.delivered",
  "transaction_id": "txn_abc123",
  "timestamp": "2025-12-21T10:30:00Z",
  "data": {
    "id": "txn_xxx",
    "email_id": "abc123-def456",
    "type": "email",
    "status": "delivered",
    "to": "recipient@example.com",
    "subject": "Your Order Confirmation",
    "from": "noreply@example.com"
  }
}
```

### Available Events

| Event | Description | When Fired |
|-------|-------------|------------|
| `email.sent` | Email accepted by mail server | Immediately after API call |
| `email.delivered` | Email reached recipient's inbox | 1-60 seconds after sent |
| `email.bounced` | Email bounced (hard/soft) | When bounce detected |
| `email.complained` | Recipient marked as spam | When complaint received |
| `email.opened` | Email opened by recipient | When tracking pixel loads |
| `email.clicked` | Link in email was clicked | When tracked link clicked |

### Managing Webhooks

#### List Your Webhooks
```bash
curl -X GET https://your-domain.com/api/v1/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "e406c83c-50bc-4783-b5fc-4beafe6bf5eb",
      "url": "https://your-server.com/webhooks/sendcomms",
      "events": ["email.sent", "email.delivered", "email.bounced"],
      "is_active": true,
      "created_at": "2025-12-21T23:25:11.929223+00:00"
    }
  ]
}
```

#### Delete a Webhook
```bash
curl -X DELETE "https://your-domain.com/api/v1/webhooks?id=e406c83c-50bc-4783-b5fc-4beafe6bf5eb" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Webhook Best Practices

1. **Return 200 quickly** - Process webhooks asynchronously to avoid timeouts
2. **Verify signatures** - Always verify the `X-SendComms-Signature` header
3. **Handle duplicates** - Use `transaction_id` for idempotency
4. **Use HTTPS** - Webhook URLs must use HTTPS
5. **Implement retries** - We retry failed webhooks up to 3 times

### Testing Webhooks Locally

Use [ngrok](https://ngrok.com/) or [webhook.site](https://webhook.site) for local testing:

```bash
# Using ngrok
ngrok http 3001
# Copy the https URL (e.g., https://abc123.ngrok.io)
# Register it as your webhook URL
```

---

## �📝 Important Notes

### About the "from" Address
Currently using Resend's test domain (`onboarding@resend.dev`). To use your own domain:
1. Go to [resend.com/domains](https://resend.com/domains)
2. Add your domain (e.g., `sendcomms.com`)
3. Add the DNS records they provide
4. Wait for verification
5. Then use `from: "Name <hello@sendcomms.com>"`

### ⚠️ Resend Test Mode Limitation
When using `onboarding@resend.dev`, you can only send to email addresses that are verified with your Resend account. To send to any email address, verify your own domain.

### Pricing
| Service | Cost |
|---------|------|
| Single Email | $0.001 per recipient |
| Batch Email | $0.001 per recipient |
| Minimum charge | $0.01 per request |

### Rate Limits (Enterprise Plan)
| Timeframe | Limit |
|-----------|-------|
| Per minute | 1,000 requests |
| Per hour | 20,000 requests |
| Per day | 200,000 requests |

### Batch Limits
- **Maximum emails per batch**: 100
- **Maximum recipients per email**: 50

---

## 📚 Documentation

| Docs Page | URL |
|-----------|-----|
| Send Email | http://localhost:3000/docs/api/email |
| Batch Send | http://localhost:3000/docs/api/email/batch |
| Webhooks | http://localhost:3000/docs/api/email/webhooks |

All docs pages include interactive code examples in:
- cURL
- Node.js / JavaScript
- Python
- PHP

---

## 🔜 Next Steps

1. **Verify your domain** in Resend to use custom from addresses and send to any recipient
2. **Deploy to Vercel** for production
3. **Implement SMS** using Termii
4. **Implement Airtime/Data** using Reloadly
5. **Build customer dashboard** for sign-ups

---

## 🔗 Quick Links

| Resource | URL |
|----------|-----|
| Local Dev | http://localhost:3000 |
| API Docs (Send) | http://localhost:3000/docs/api/email |
| API Docs (Batch) | http://localhost:3000/docs/api/email/batch |
| API Docs (Webhooks) | http://localhost:3000/docs/api/email/webhooks |
| Dashboard | http://localhost:3000/dashboard |
| Supabase | https://supabase.com/dashboard |
| Resend | https://resend.com/emails |
| Upstash | https://console.upstash.com |

---

## 📊 API Response Examples

### Single Email Success Response
```json
{
  "success": true,
  "data": {
    "message_id": "abc123-def456",
    "status": "sent",
    "to": "recipient@example.com",
    "cost": 0.01,
    "transaction_id": "txn_xxx"
  }
}
```

### Batch Email Success Response
```json
{
  "success": true,
  "data": {
    "batch_id": "batch_xxx",
    "status": "sent",
    "emails_sent": 4,
    "total_recipients": 4,
    "cost": 0.04,
    "currency": "USD",
    "results": {
      "data": [
        { "id": "email-id-1" },
        { "id": "email-id-2" }
      ]
    }
  }
}
```

### Webhook Registration Response
```json
{
  "success": true,
  "data": {
    "id": "e406c83c-50bc-4783-b5fc-4beafe6bf5eb",
    "url": "https://your-server.com/webhooks",
    "events": ["email.sent", "email.delivered", "email.bounced"],
    "secret": "whsec_21be983f359112f9e07658ed2bddcee3062699a6ab70b092",
    "active": true,
    "created_at": "2025-12-21T23:25:12.006Z"
  }
}
```

### Webhook Event Payload
```json
{
  "event": "email.delivered",
  "transaction_id": "txn_mjgc0ejr_3ca715bfb7a0",
  "timestamp": "2025-12-21T10:30:00Z",
  "data": {
    "id": "txn_xxx",
    "email_id": "abc123-def456",
    "type": "email",
    "status": "delivered",
    "to": "recipient@example.com",
    "subject": "Welcome!",
    "from": "hello@example.com"
  }
}
```
```

---

*Updated: December 21, 2025*
