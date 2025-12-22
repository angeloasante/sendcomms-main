# Datamart Ghana API Integration Guide

> **Base URL:** `https://api.datamartgh.shop/api/developer`  
> **Authentication:** API Key via `X-API-Key` header

---

## Authentication

All requests must include the API key in the header:

```bash
X-API-Key: 16b526a298456e25e191dd625929cf3430615ae707439094c052e5ae10277d63
```

---

## Supported Networks

| Network Code | Provider | Description |
|--------------|----------|-------------|
| `YELLO` | MTN Ghana | MTN data bundles |
| `TELECEL` | Telecel (Vodafone) | Telecel data bundles |
| `AT_PREMIUM` | AirtelTigo | AirtelTigo data bundles |
| `at` | AirtelTigo | Alternative code (same as AT_PREMIUM) |

---

## Available Data Packages

### MTN (YELLO) - Prices in GH₵

| Capacity | MB | Price |
|----------|------|-------|
| 1 GB | 1000 | 4.10 |
| 2 GB | 2000 | 8.50 |
| 3 GB | 3000 | 12.50 |
| 4 GB | 4000 | 16.50 |
| 5 GB | 5000 | 20.50 |
| 6 GB | 6000 | 24.00 |
| 8 GB | 8000 | 32.00 |
| 10 GB | 10000 | 41.00 |
| 15 GB | 15000 | 58.50 |
| 20 GB | 20000 | 78.00 |
| 25 GB | 25000 | 98.00 |
| 30 GB | 30000 | 120.00 |
| 40 GB | 40000 | 159.00 |
| 50 GB | 50000 | 202.00 |
| 100 GB | 100000 | 407.00 |

### Telecel (TELECEL) - Prices in GH₵

| Capacity | MB | Price |
|----------|------|-------|
| 5 GB | 5000 | 19.50 |
| 8 GB | 8000 | 34.64 |
| 10 GB | 10000 | 36.50 |
| 12 GB | 12000 | 43.70 |
| 15 GB | 15000 | 52.85 |
| 20 GB | 20000 | 69.80 |
| 25 GB | 25000 | 86.75 |
| 30 GB | 30000 | 103.70 |
| 35 GB | 35000 | 120.65 |
| 40 GB | 40000 | 137.60 |
| 45 GB | 45000 | 154.55 |
| 50 GB | 50000 | 171.50 |
| 100 GB | 100000 | 341.00 |

### AirtelTigo (AT_PREMIUM) - Prices in GH₵

| Capacity | MB | Price |
|----------|------|-------|
| 1 GB | 1000 | 3.95 |
| 2 GB | 2000 | 8.35 |
| 3 GB | 3000 | 13.25 |
| 4 GB | 4000 | 16.50 |
| 5 GB | 5000 | 19.50 |
| 6 GB | 6000 | 23.50 |
| 8 GB | 8000 | 30.50 |
| 10 GB | 10000 | 38.50 |
| 12 GB | 12000 | 45.50 |
| 15 GB | 15000 | 57.50 |
| 25 GB | 25000 | 95.00 |
| 30 GB | 30000 | 115.00 |
| 40 GB | 40000 | 151.00 |
| 50 GB | 50000 | 190.00 |

---

## API Endpoints

### 1. Get Data Packages

**Endpoint:** `GET /data-packages`

Get all available data packages across all networks:

```bash
curl -X GET "https://api.datamartgh.shop/api/developer/data-packages" \
  -H "X-API-Key: YOUR_API_KEY"
```

Get packages for a specific network:

```bash
curl -X GET "https://api.datamartgh.shop/api/developer/data-packages?network=YELLO" \
  -H "X-API-Key: YOUR_API_KEY"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "YELLO": [
      { "capacity": "5", "mb": "5000", "price": "20.50", "network": "YELLO", "inStock": true }
    ],
    "TELECEL": [...],
    "AT_PREMIUM": [...]
  }
}
```

---

### 2. Purchase Data Bundle

**Endpoint:** `POST /purchase`

```bash
curl -X POST "https://api.datamartgh.shop/api/developer/purchase" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "0551234567",
    "network": "YELLO",
    "capacity": "5",
    "gateway": "wallet"
  }'
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phoneNumber` | string | Yes | Recipient's phone number (e.g., "0551234567") |
| `network` | string | Yes | Network code: `YELLO`, `TELECEL`, or `AT_PREMIUM` |
| `capacity` | string | Yes | Data capacity in GB (e.g., "5", "10", "20") |
| `gateway` | string | Yes | Payment method, use `"wallet"` |

**Success Response (201):**
```json
{
  "status": "success",
  "message": "Order placed successfully. Your order will be processed manually.",
  "data": {
    "purchaseId": "6948c1ced9d8791d62d31c52",
    "transactionReference": "TRX-132947df-4c6c-4d9a-9703-64ece4bc310a",
    "orderReference": "MN-BC0757EB",
    "network": "YELLO",
    "capacity": "1",
    "mb": "1000",
    "price": 4.1,
    "balanceBefore": 14.5,
    "balanceAfter": 10.4,
    "remainingBalance": 10.4,
    "orderStatus": "pending",
    "processingMethod": "manual",
    "orderPrefix": "MN-",
    "usedGeonettech": false,
    "usedTelecelAPI": false,
    "isATPremium": false,
    "dealerUser": false,
    "pricingType": "standard",
    "apiResponse": {
      "status": "pending",
      "message": "Order stored for manual processing",
      "reference": "MN-BC0757EB",
      "processingMethod": "manual",
      "skipReason": "inventory-default"
    }
  }
}
```

> ⚠️ **Important:** Orders may be processed **manually** (not instant). The `orderStatus` will be `pending` until Datamart staff processes it. Check `processingMethod` field to know if it's `manual` or `automatic`.

**Error Response:**
```json
{
  "status": "error",
  "message": "Insufficient wallet balance",
  "details": { ... }
}
```

---

### 3. Transaction History

**Endpoint:** `GET /transactions`

```bash
curl -X GET "https://api.datamartgh.shop/api/developer/transactions?page=1&limit=20" \
  -H "X-API-Key: YOUR_API_KEY"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "transactions": [
      {
        "_id": "6948c1ced9d8791d62d31c51",
        "type": "purchase",
        "amount": 4.1,
        "balanceBefore": 14.5,
        "balanceAfter": 10.4,
        "balanceChange": -4.1,
        "isCredit": false,
        "status": "completed",
        "reference": "TRX-132947df-4c6c-4d9a-9703-64ece4bc310a",
        "gateway": "wallet",
        "description": "Data purchase: 1GB YELLO for 0540800994",
        "relatedPurchase": {
          "_id": "6948c1ced9d8791d62d31c52",
          "phoneNumber": "0540800994",
          "network": "YELLO",
          "capacity": 1
        },
        "createdAt": "2025-12-22T03:58:06.952Z"
      },
      {
        "_id": "6948bebad9d8791d62d3101b",
        "type": "deposit",
        "amount": 11,
        "balanceBefore": 3.5,
        "balanceAfter": 14.5,
        "balanceChange": 11,
        "isCredit": true,
        "status": "completed",
        "reference": "DEP-18c582e385d4c0f15866-1766375098361",
        "gateway": "paystack",
        "description": "Wallet deposit via Paystack",
        "relatedPurchase": null,
        "createdAt": "2025-12-22T03:44:58.362Z"
      }
    ],
    "currentBalance": 10.4,
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 49
    }
  }
}
```

> **Note:** The `currentBalance` field shows your current wallet balance. Transaction `status` being `completed` means the wallet was charged, NOT that the data was delivered.

---

## Verification & Webhooks

### ⚠️ No Native Webhook Support

Datamart does **NOT** provide webhook callbacks for transaction status updates. You must implement your own verification strategy.

### Recommended Verification Methods

#### Option 1: Check Response on Purchase (Immediate)

The purchase API returns a response immediately. Check the `status` field:

```javascript
const response = await purchaseData(phoneNumber, network, capacity);

if (response.status === "success") {
  // Transaction successful
  const { purchaseId, transactionReference, price } = response.data;
  // Save to your database
} else {
  // Transaction failed
  console.error(response.message);
}
```

#### Option 2: Poll Transaction History

If you need to verify a transaction later:

```javascript
async function verifyTransaction(transactionReference) {
  const response = await fetch(
    `https://api.datamartgh.shop/api/developer/transactions?page=1&limit=50`,
    {
      headers: {
        'X-API-Key': process.env.DATAMART_API_KEY,
      },
    }
  );
  
  const data = await response.json();
  
  if (data.status === 'success') {
    const transaction = data.data.transactions.find(
      tx => tx.reference === transactionReference
    );
    
    if (transaction) {
      return {
        found: true,
        status: transaction.status, // "completed", "pending", "failed"
        amount: transaction.amount,
        createdAt: transaction.createdAt
      };
    }
  }
  
  return { found: false };
}
```

#### Option 3: Implement Your Own Webhook System

Since Datamart doesn't call your webhook, you can:

1. **Save transaction to your database** with "pending" status
2. **On successful response**, update to "completed"
3. **Trigger your own internal webhook** to notify other services

```javascript
// In your purchase handler
async function handleDatamartPurchase(phoneNumber, network, capacity, customerId) {
  // 1. Create pending transaction in your database
  const localTransaction = await db.transactions.create({
    customer_id: customerId,
    provider: 'datamart',
    phone_number: phoneNumber,
    network,
    capacity,
    status: 'pending',
    created_at: new Date()
  });

  try {
    // 2. Call Datamart API
    const response = await fetch('https://api.datamartgh.shop/api/developer/purchase', {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.DATAMART_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phoneNumber, network, capacity, gateway: 'wallet' })
    });

    const result = await response.json();

    // 3. Update transaction status
    if (result.status === 'success') {
      await db.transactions.update(localTransaction.id, {
        status: 'completed',
        provider_reference: result.data.transactionReference,
        provider_purchase_id: result.data.purchaseId,
        price: result.data.price,
        completed_at: new Date()
      });

      // 4. Trigger your internal webhook (if needed)
      await triggerInternalWebhook('data.purchase.completed', {
        transaction_id: localTransaction.id,
        customer_id: customerId,
        phone_number: phoneNumber,
        network,
        capacity,
        price: result.data.price
      });

      return { success: true, data: result.data };
    } else {
      await db.transactions.update(localTransaction.id, {
        status: 'failed',
        error_message: result.message
      });

      return { success: false, error: result.message };
    }
  } catch (error) {
    await db.transactions.update(localTransaction.id, {
      status: 'failed',
      error_message: error.message
    });

    throw error;
  }
}
```

---

## Implementation Checklist

- [ ] Add `DATAMART_API_KEY` to environment variables
- [ ] Create `/api/v1/data/packages` endpoint to list packages
- [ ] Create `/api/v1/data/purchase` endpoint for purchases
- [ ] Add transaction logging to database
- [ ] Implement wallet balance check before purchase
- [ ] Add rate limiting to prevent abuse
- [ ] Create internal webhook system for notifications
- [ ] Add retry logic for failed transactions

---

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| Insufficient wallet balance | Account has no funds | Top up Datamart wallet |
| Invalid network | Wrong network code | Use `YELLO`, `TELECEL`, or `AT_PREMIUM` |
| Invalid capacity | Package doesn't exist | Check `/data-packages` for valid options |
| Invalid phone number | Wrong format | Use format like `0551234567` |
| API key invalid | Wrong or expired key | Get new key from dashboard |

---

## Support

- **WhatsApp:** 0597760914
- **Email:** datamartghana@gmail.com
- **Developer Community:** https://chat.whatsapp.com/HfHCT72jm2Z1B14fsJjuhT

---

## Environment Variables

```env
DATAMART_API_KEY=16b526a298456e25e191dd625929cf3430615ae707439094c052e5ae10277d63
DATAMART_API_URL=https://api.datamartgh.shop/api/developer
```

---

## Tested on December 22, 2025

✅ **Purchase Test:**
- Phone: 0540800994 (MTN)
- Data: 1GB
- Price: GH₵ 4.10
- Order Reference: `MN-BC0757EB`
- Processing: Manual (not instant)

✅ **Transaction History:** Working - shows wallet deductions and deposits

⚠️ **Key Findings:**
1. Orders may be processed manually, not instantly
2. Transaction `status: completed` = wallet charged (not data delivered)
3. Check `orderStatus` and `processingMethod` in purchase response
4. No webhook support - must poll or check response directly

---

## AfricaComms API Integration

Our API wraps the Datamart API with additional features:

### List Data Packages

```bash
GET /api/v1/data/packages
Authorization: Bearer sc_live_xxx

# Filter by network
GET /api/v1/data/packages?network=mtn
```

**Response:**
```json
{
  "success": true,
  "data": {
    "country": "Ghana",
    "country_code": "GH",
    "currency": "GHS",
    "networks": {
      "mtn": [
        {
          "network": "MTN Ghana",
          "network_code": "mtn",
          "capacity_gb": 1,
          "capacity_mb": 1000,
          "price": { "amount": 4.1, "currency": "GHS" },
          "in_stock": true
        }
      ],
      "telecel": ["..."],
      "airteltigo": ["..."]
    }
  }
}
```

### Purchase Data Bundle

```bash
POST /api/v1/data/purchase
Authorization: Bearer sc_live_xxx
Content-Type: application/json

{
  "phone_number": "0540800994",
  "network": "mtn",
  "capacity_gb": 1,
  "reference": "order-123",
  "metadata": { "user_id": "abc" }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "data_mjgnao02_8951bda412cb",
    "status": "processing",
    "phone_number": "0540800994",
    "network": "mtn",
    "capacity_gb": 1,
    "price": { "amount": 4.1, "currency": "GHS" },
    "provider_reference": "TRX-xxx",
    "order_reference": "MN-QB2457ZP",
    "processing_method": "manual",
    "message": "Order placed successfully.",
    "created_at": "2025-12-22T04:17:42.950Z"
  }
}
```

### Check Transaction Status

```bash
GET /api/v1/data/purchase?transaction_id=data_mjgnao02_8951bda412cb
Authorization: Bearer sc_live_xxx
```

### Webhooks

Configure a webhook URL in your dashboard to receive real-time notifications:

**Event: `data.purchased`** - Fired on successful purchase
**Event: `data.failed`** - Fired on failed purchase

### Network Codes

| Our API | Datamart Code | Provider |
|---------|---------------|----------|
| `mtn` | `YELLO` | MTN Ghana |
| `telecel` or `vodafone` | `TELECEL` | Telecel |
| `airteltigo` | `AT_PREMIUM` | AirtelTigo |

---

✅ **AfricaComms API Tested:** December 22, 2025
- Purchase: Working ✓
- Status Check: Working ✓
- Webhooks: Ready (requires customer webhook URL)
