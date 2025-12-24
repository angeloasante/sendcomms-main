-- Migration: Add billing tracking fields
-- This migration adds fields for better tracking of payment failures and subscription status

-- Add failed payment tracking to subscriptions
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS failed_payment_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_payment_error TEXT;

-- Create billing_events table for audit trail
CREATE TABLE IF NOT EXISTS billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Index for querying customer events
    CONSTRAINT billing_events_customer_id_created_at_idx 
        UNIQUE (customer_id, created_at, id)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_billing_events_customer ON billing_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_created ON billing_events(created_at DESC);

-- Add stripe_invoice_id unique constraint to invoices if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'invoices_stripe_invoice_id_key'
    ) THEN
        ALTER TABLE invoices 
        ADD CONSTRAINT invoices_stripe_invoice_id_key 
        UNIQUE (stripe_invoice_id);
    END IF;
EXCEPTION WHEN duplicate_table THEN
    -- ignore
END;
$$;

-- Update subscription status enum to include new statuses
-- Note: PostgreSQL doesn't allow easy enum modification, so we use check constraint instead
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check 
    CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'paused', 'unpaid'));

-- Add comment explaining the statuses
COMMENT ON COLUMN subscriptions.status IS 'active: paid and active, past_due: payment failed but retrying, unpaid: all retries exhausted, cancelled: user cancelled, paused: temporarily paused, trialing: in trial period';

COMMENT ON COLUMN subscriptions.failed_payment_count IS 'Number of consecutive failed payment attempts. Reset to 0 on successful payment.';

COMMENT ON TABLE billing_events IS 'Audit log of all billing-related events for compliance and debugging';
