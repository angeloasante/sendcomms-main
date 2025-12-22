# SendComms API - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- An Upstash account (free tier works)
- A Resend account (free tier works)

---

## Step 1: Clone & Install

```bash
cd sendcomms
npm install
```

---

## Step 2: Set Up Upstash Redis (Rate Limiting)

### Why Redis?
Redis is used for:
- **Rate limiting** - Preventing API abuse
- **Caching** - Faster responses
- **Session data** - Temporary storage

### Get Your Free Redis Database

1. **Go to** [https://console.upstash.com](https://console.upstash.com)

2. **Sign up** with GitHub, Google, or email

3. **Click "Create Database"**
   
   ![Create Database](https://upstash.com/docs/img/create-database.png)

4. **Configure:**
   - Name: `sendcomms`
   - Region: `eu-west-1` (closest to Africa)
   - Type: Regional

5. **Click "Create"**

6. **Copy your credentials** from the REST API section:
   ```
   UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AYourTokenxxxxxxxxxxxx==
   ```

### Add to .env.local

```bash
UPSTASH_REDIS_REST_URL=https://your-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

---

## Step 3: Set Up Supabase (Database)

Your Supabase is already configured! Just run the schema:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor**
4. Run the schema from `database/schema.sql`

---

## Step 4: Create Your First API Key

Run this SQL in Supabase SQL Editor:

```sql
-- Create admin customer
INSERT INTO customers (id, email, company_name, plan, balance, is_active)
VALUES (
  gen_random_uuid(),
  'admin@sendcomms.com',
  'SendComms Admin',
  'enterprise',
  1000.00,
  true
)
RETURNING id;

-- Copy the ID and use it below (replace YOUR_CUSTOMER_ID)
INSERT INTO api_keys (id, customer_id, key_hash, name, scopes, is_active)
VALUES (
  gen_random_uuid(),
  'YOUR_CUSTOMER_ID',  -- paste the ID from above
  'ac_live_' || encode(gen_random_bytes(24), 'hex'),
  'Admin API Key',
  ARRAY['email', 'sms', 'airtime', 'data'],
  true
)
RETURNING key_hash;
```

Save the `key_hash` - this is your API key!

---

## Step 5: Test the API

### Send an Email

```bash
curl -X POST http://localhost:3000/api/v1/email/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Hello from SendComms!",
    "html": "<h1>It works!</h1>"
  }'
```

### Check Usage

```bash
curl http://localhost:3000/api/v1/usage \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## Step 6: Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add your environment variables in Vercel dashboard.

---

## 🎉 You're Done!

Your SendComms API is now running. Check the full documentation at `docs/IMPLEMENTATION.md`.

---

## Quick Reference

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/email/send` | POST | Send single email |
| `/api/v1/email/batch` | POST | Send batch emails |
| `/api/v1/usage` | GET | Get usage stats |
| `/api/v1/sms/send` | POST | Send SMS (coming soon) |
| `/api/v1/airtime/purchase` | POST | Buy airtime (coming soon) |
| `/api/v1/data/purchase` | POST | Buy data (coming soon) |

### Rate Limits

| Plan | Per Minute | Per Hour | Per Day |
|------|------------|----------|---------|
| Free | 10 | 100 | 1,000 |
| Starter | 60 | 1,000 | 10,000 |
| Pro | 300 | 5,000 | 50,000 |
| Enterprise | 1,000 | 20,000 | 200,000 |

---

## Troubleshooting

### "supabaseUrl is required"
- Make sure `NEXT_PUBLIC_SUPABASE_URL` is set in `.env.local`

### "Redis connection failed"
- Check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### "Invalid API key"
- Ensure you're using the `key_hash` from the database
- Check the `Authorization` header format: `Bearer YOUR_KEY`

---

*Need help? Check the full docs at `docs/IMPLEMENTATION.md`*
