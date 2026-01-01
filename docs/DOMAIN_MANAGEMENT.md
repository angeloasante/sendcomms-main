# Domain Management Implementation

## Overview

This document details the implementation of domain management for SendComms, integrating with the Resend Domains API. The system allows customers to add, verify, and manage custom sending domains for email delivery.

## Architecture

### Components Created

```
lib/email/domains.ts              # Resend Domains API client wrapper
migrations/013_domain_management.sql  # Database schema for domains
app/api/v1/domains/
  ├── route.ts                    # GET (list), POST (create)
  ├── [domainId]/
  │   ├── route.ts                # GET (detail), PATCH (update), DELETE
  │   └── verify/
  │       └── route.ts            # POST (trigger verification)
  └── sync/
      └── route.ts                # POST (sync all domains with Resend)
app/dashboard/emails/page.tsx     # Updated UI with Domain tab
```

## Database Schema

### Tables

#### `customer_domains`
Stores domain information linked to Resend.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| customer_id | UUID | FK to customers table |
| resend_domain_id | VARCHAR(255) | Domain ID from Resend API |
| name | VARCHAR(255) | Domain name (e.g., example.com) |
| status | VARCHAR(50) | not_started, pending, verified, failed, temporary_failure |
| region | VARCHAR(50) | us-east-1, eu-west-1, sa-east-1, ap-northeast-1 |
| custom_return_path | VARCHAR(63) | Custom subdomain for Return-Path |
| open_tracking | BOOLEAN | Track email opens |
| click_tracking | BOOLEAN | Track link clicks |
| tls | VARCHAR(20) | opportunistic or enforced |
| sending_enabled | BOOLEAN | Can send emails |
| receiving_enabled | BOOLEAN | Can receive emails |
| dns_records | JSONB | DNS records from Resend |
| is_primary | BOOLEAN | Primary sending domain |
| is_active | BOOLEAN | Soft delete flag |
| verified_at | TIMESTAMP | When domain was verified |
| last_checked_at | TIMESTAMP | Last verification check |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

#### `domain_verification_logs`
Tracks verification attempts and status changes.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| domain_id | UUID | FK to customer_domains |
| customer_id | UUID | FK to customers |
| previous_status | VARCHAR(50) | Status before change |
| new_status | VARCHAR(50) | Status after change |
| triggered_by | VARCHAR(50) | manual, auto, webhook |
| spf_status | VARCHAR(50) | SPF record status |
| dkim_status | VARCHAR(50) | DKIM record status |
| error_message | TEXT | Error if verification failed |
| metadata | JSONB | Additional data |
| created_at | TIMESTAMP | When logged |

#### `domain_email_stats`
Daily aggregated email statistics per domain.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| domain_id | UUID | FK to customer_domains |
| customer_id | UUID | FK to customers |
| stat_date | DATE | Date of statistics |
| emails_sent | INTEGER | Count of sent emails |
| emails_delivered | INTEGER | Count of delivered emails |
| emails_bounced | INTEGER | Count of bounced emails |
| emails_complained | INTEGER | Count of complaints |
| emails_opened | INTEGER | Count of opens |
| emails_clicked | INTEGER | Count of clicks |
| delivery_rate | DECIMAL(5,2) | Calculated delivery rate |
| bounce_rate | DECIMAL(5,2) | Calculated bounce rate |
| complaint_rate | DECIMAL(5,2) | Calculated complaint rate |
| open_rate | DECIMAL(5,2) | Calculated open rate |
| click_rate | DECIMAL(5,2) | Calculated click rate |

### Database Functions

- `set_primary_domain(p_domain_id, p_customer_id)` - Sets a domain as primary
- `update_domain_email_stats(...)` - Updates daily email statistics
- `log_domain_status_change()` - Trigger to log status changes

## API Endpoints

### List Domains
```
GET /api/v1/domains
```
Returns all active domains for the authenticated customer.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "resend_domain_id": "string",
      "name": "example.com",
      "status": "verified",
      "status_description": "Domain is verified and ready to send emails.",
      "region": "us-east-1",
      "dns_records": [...],
      "is_primary": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pending_verification": 0
}
```

### Create Domain
```
POST /api/v1/domains
```
Creates a new domain in Resend and stores it locally.

**Request Body:**
```json
{
  "name": "mail.example.com",
  "region": "us-east-1",
  "customReturnPath": "bounce",
  "openTracking": false,
  "clickTracking": false,
  "tls": "opportunistic",
  "setPrimary": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "resend_domain_id": "string",
    "name": "mail.example.com",
    "status": "not_started",
    "dns_records": [
      {
        "record": "SPF",
        "name": "send",
        "type": "MX",
        "ttl": "Auto",
        "status": "not_started",
        "value": "feedback-smtp.us-east-1.amazonses.com",
        "priority": 10
      },
      // ... more records
    ]
  },
  "message": "Domain created successfully. Please add the DNS records to verify your domain."
}
```

### Get Domain Details
```
GET /api/v1/domains/:domainId
```
Returns detailed domain information including DNS records and verification history.

### Update Domain
```
PATCH /api/v1/domains/:domainId
```
Updates domain settings (tracking, TLS, primary status).

**Request Body:**
```json
{
  "openTracking": true,
  "clickTracking": true,
  "tls": "enforced",
  "setPrimary": true
}
```

### Delete Domain
```
DELETE /api/v1/domains/:domainId
```
Soft-deletes a domain. Cannot delete primary domain if other domains exist.

### Verify Domain
```
POST /api/v1/domains/:domainId/verify
```
Triggers DNS verification for a domain.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "mail.example.com",
    "status": "pending",
    "status_description": "Verification in progress. DNS propagation can take up to 72 hours.",
    "dns_records": [...]
  },
  "message": "Verification initiated. DNS propagation may take up to 72 hours."
}
```

### Sync Domains
```
POST /api/v1/domains/sync
```
Syncs all domains with Resend to get latest status.

## Domain Status Values

| Status | Description |
|--------|-------------|
| `not_started` | Domain added but Verify not clicked yet |
| `pending` | Verification in progress, waiting for DNS propagation |
| `verified` | Domain verified and ready to send |
| `failed` | DNS records not detected within 72 hours |
| `temporary_failure` | DNS records temporarily not detected, will retry |

## Plan Limits

Domain limits per plan:
- **Free**: 1 domain
- **Starter**: 3 domains
- **Pro**: 10 domains
- **Enterprise**: 100 domains

## DNS Records Required

When a domain is created, Resend provides the following DNS records:

### SPF Records (Required)
1. **MX Record** - For bounce handling
   - Type: MX
   - Host: send (or custom return path)
   - Value: feedback-smtp.{region}.amazonses.com
   - Priority: 10

2. **TXT Record** - SPF policy
   - Type: TXT
   - Host: send (or custom return path)
   - Value: "v=spf1 include:amazonses.com ~all"

### DKIM Records (Required)
3 CNAME records for DKIM signing:
- Type: CNAME
- Host: {selector}._domainkey
- Value: {selector}.dkim.amazonses.com.

### DMARC Record (Recommended)
Optional but recommended for better deliverability.

## Client Library (lib/email/domains.ts)

### Functions

| Function | Description |
|----------|-------------|
| `createDomain(params)` | Create a domain in Resend |
| `verifyDomain(domainId)` | Trigger DNS verification |
| `getDomain(domainId)` | Get domain details with DNS records |
| `listDomains(params)` | List all domains |
| `updateDomain(params)` | Update domain settings |
| `deleteDomain(domainId)` | Remove a domain |

### Helper Functions

| Function | Description |
|----------|-------------|
| `getDomainStatusDescription(status)` | Human-readable status description |
| `getDomainStatusColor(status)` | UI color for status badge |
| `canDomainSendEmails(domain)` | Check if domain can send |
| `getRegionDescription(region)` | Human-readable region name |
| `groupDnsRecords(records)` | Group records by type |
| `areAllRecordsVerified(records)` | Check if all required records verified |

### Types

```typescript
type DomainStatus = 'not_started' | 'pending' | 'verified' | 'failed' | 'temporary_failure';
type DomainRegion = 'us-east-1' | 'eu-west-1' | 'sa-east-1' | 'ap-northeast-1';
type TlsSetting = 'opportunistic' | 'enforced';

interface Domain {
  id: string;
  name: string;
  status: DomainStatus;
  created_at: string;
  region: DomainRegion;
  capabilities: DomainCapabilities;
  records?: DnsRecord[];
}

interface DnsRecord {
  record: 'SPF' | 'DKIM' | 'DMARC' | 'MX';
  name: string;
  type: 'TXT' | 'CNAME' | 'MX';
  ttl: string;
  status: DomainStatus;
  value: string;
  priority?: number;
}
```

## UI Features

The Domain tab in the emails dashboard includes:

1. **Domain Stats Cards**
   - Verified domains count
   - Pending domains count
   - Total emails sent
   - Reputation score

2. **Domain List**
   - Domain name with status badge
   - Primary domain indicator
   - DNS record status indicators (SPF, DKIM, DMARC)
   - Verify button for pending domains
   - Settings and delete buttons

3. **Add Domain Modal**
   - Domain name input
   - Region selector
   - Subdomain recommendation

4. **DNS Records Viewer**
   - Expandable per domain
   - Copy button for each record
   - Status indicator per record
   - Record type, host, value display

5. **Sync Button**
   - Refreshes all domain statuses from Resend

## What's Done ✅

1. **Library** (`lib/email/domains.ts`)
   - Complete Resend Domains API wrapper
   - All CRUD operations
   - Verification triggering
   - Type definitions
   - Helper functions

2. **Database** (`migrations/013_domain_management.sql`)
   - customer_domains table
   - domain_verification_logs table
   - domain_email_stats table
   - Indexes for performance
   - RLS policies
   - Helper functions and triggers

3. **API Routes**
   - GET /api/v1/domains (list)
   - POST /api/v1/domains (create)
   - GET /api/v1/domains/:id (detail)
   - PATCH /api/v1/domains/:id (update)
   - DELETE /api/v1/domains/:id (delete)
   - POST /api/v1/domains/:id/verify (verify)
   - POST /api/v1/domains/sync (sync all)

4. **UI** (`app/dashboard/emails/page.tsx`)
   - Domain tab with real data fetching
   - Add domain modal
   - Domain list with status
   - DNS records viewer
   - Verify, delete, sync buttons
   - Error handling
   - Loading states

5. **Email Integration** (`lib/email/resend.ts`)
   - `getCustomerSendingDomain(customerId)` - Gets customer's verified primary domain
   - `buildFromAddress(customerId, providedFrom)` - Builds the 'from' address with domain lookup
   - Updated `sendEmail()` - Now accepts `customerId` parameter for automatic domain lookup
   - Updated `sendBatchEmails()` - Now accepts `customerId` parameter for automatic domain lookup
   - Default fallback to `info@sendcomms.com` when no verified domain exists
   - Validates custom `from` addresses against customer's verified domains
   - Email send routes updated to pass `customerId` for domain resolution

6. **Webhook Handler for Domain Status** (`app/api/webhooks/resend/route.ts`)
   - Handles `domain.created`, `domain.updated`, `domain.deleted` events from Resend
   - Auto-updates domain status in `customer_domains` table
   - Logs status changes to `domain_verification_logs` table
   - Soft-deletes domains when deleted from Resend dashboard
   - Maps `partially_failed` status to `verified` (for send-only domains)

## What Needs to Be Done 📋

### Required Before Production

1. **Run Database Migration**
   ```sql
   -- Run migrations/013_domain_management.sql in Supabase
   ```

2. **Test with Real Resend API**
   - Ensure RESEND_API_KEY is set
   - Test domain creation flow
   - Test DNS verification

3. **Configure Resend Webhook**
   - In Resend dashboard, add webhook endpoint: `https://your-domain.com/api/webhooks/resend`
   - Enable events: `domain.created`, `domain.updated`, `domain.deleted`
   - Set `RESEND_WEBHOOK_SECRET` env var

### Nice to Have

2. **Auto-Verification Cron Job**
   - Periodically check pending domains
   - Auto-sync status from Resend

3. **Domain Settings Page**
   - Dedicated settings page per domain
   - Advanced tracking options
   - TLS configuration

4. **Email Address Management**
   - Create email addresses under domains
   - Assign default from addresses

5. **Analytics per Domain**
   - Track emails sent per domain
   - Reputation score calculation
   - Bounce/complaint rates

6. **DNS Checker Tool**
   - Pre-verification DNS check
   - Show propagation status
   - Helpful error messages

## Testing

### Manual Testing Steps

1. **Create Domain**
   - Go to Dashboard > Emails > Domain tab
   - Click "Add Domain"
   - Enter a domain you own
   - Verify DNS records are returned

2. **Configure DNS**
   - Add DNS records to your provider
   - Wait for propagation (can test with dig/nslookup)

3. **Verify Domain**
   - Click "Verify" button
   - Check status changes to pending/verified

4. **Delete Domain**
   - Click delete icon
   - Confirm deletion
   - Verify domain removed from list

### API Testing (cURL)

```bash
# List domains
curl -X GET http://localhost:3000/api/v1/domains \
  -H "Cookie: <auth-cookie>"

# Create domain
curl -X POST http://localhost:3000/api/v1/domains \
  -H "Content-Type: application/json" \
  -H "Cookie: <auth-cookie>" \
  -d '{"name": "mail.example.com", "region": "us-east-1"}'

# Verify domain
curl -X POST http://localhost:3000/api/v1/domains/<domain-id>/verify \
  -H "Cookie: <auth-cookie>"

# Sync domains
curl -X POST http://localhost:3000/api/v1/domains/sync \
  -H "Cookie: <auth-cookie>"
```

## Security Considerations

1. **Authentication**: All endpoints require authenticated user
2. **Authorization**: Users can only access their own domains
3. **Rate Limiting**: Consider adding rate limits to prevent abuse
4. **Validation**: Domain names validated before creation
5. **Soft Delete**: Domains are soft-deleted (is_active = false)

## References

- [Resend Domains API - Create](https://resend.com/docs/api-reference/domains/create-domain)
- [Resend Domains API - Verify](https://resend.com/docs/api-reference/domains/verify-domain)
- [Resend Domains API - Get](https://resend.com/docs/api-reference/domains/get-domain)
- [Resend Domains API - List](https://resend.com/docs/api-reference/domains/list-domains)
- [Resend Domains API - Update](https://resend.com/docs/api-reference/domains/update-domain)
- [Resend Domains API - Delete](https://resend.com/docs/api-reference/domains/delete-domain)
- [Resend Domain Status Guide](https://resend.com/docs/dashboard/domains/introduction#understand-a-domain-status)
