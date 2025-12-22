-- Customer Webhooks Table
-- This table stores webhook configurations for each customer

CREATE TABLE IF NOT EXISTS customer_webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Each customer can have multiple webhook endpoints
  CONSTRAINT valid_url CHECK (url ~ '^https://')
);

-- Index for fast customer lookups
CREATE INDEX IF NOT EXISTS idx_customer_webhooks_customer_id ON customer_webhooks(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_webhooks_active ON customer_webhooks(is_active) WHERE is_active = true;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_customer_webhooks_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customer_webhooks_timestamp ON customer_webhooks;
CREATE TRIGGER update_customer_webhooks_timestamp
  BEFORE UPDATE ON customer_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_webhooks_timestamp();

-- RLS Policy
ALTER TABLE customer_webhooks ENABLE ROW LEVEL SECURITY;

-- Allow full access via service key
CREATE POLICY "Service key full access" ON customer_webhooks
  FOR ALL USING (true);

COMMENT ON TABLE customer_webhooks IS 'Stores webhook endpoint configurations for customers';
COMMENT ON COLUMN customer_webhooks.url IS 'HTTPS URL to receive webhook events';
COMMENT ON COLUMN customer_webhooks.events IS 'Array of event types to receive (e.g., email.sent, email.delivered)';
COMMENT ON COLUMN customer_webhooks.secret IS 'Secret key used to sign webhook payloads';
