-- Migration: Create test_transactions table for sandbox mode
-- This table stores all test/sandbox API calls for debugging and testing

CREATE TABLE IF NOT EXISTS test_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  
  -- Transaction details
  service TEXT NOT NULL CHECK (service IN ('sms', 'email', 'data', 'airtime')),
  endpoint TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  
  -- Request/Response data
  request_body JSONB NOT NULL DEFAULT '{}',
  response_body JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_test_transactions_customer ON test_transactions(customer_id);
CREATE INDEX idx_test_transactions_service ON test_transactions(service);
CREATE INDEX idx_test_transactions_created ON test_transactions(created_at DESC);
CREATE INDEX idx_test_transactions_transaction_id ON test_transactions(transaction_id);

-- Add is_test column to api_keys table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'api_keys' AND column_name = 'is_test'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN is_test BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create index for is_test
CREATE INDEX IF NOT EXISTS idx_api_keys_is_test ON api_keys(is_test);

-- Add comment for documentation
COMMENT ON TABLE test_transactions IS 'Stores sandbox/test mode API transactions for debugging. No real charges or messages.';
COMMENT ON COLUMN test_transactions.service IS 'The service type: sms, email, data, or airtime';
COMMENT ON COLUMN test_transactions.transaction_id IS 'The mock transaction ID returned to the customer';

-- RLS Policies
ALTER TABLE test_transactions ENABLE ROW LEVEL SECURITY;

-- Customers can only see their own test transactions
CREATE POLICY "Customers can view own test transactions"
  ON test_transactions
  FOR SELECT
  USING (customer_id = auth.uid());

-- Service role can insert test transactions
CREATE POLICY "Service can insert test transactions"
  ON test_transactions
  FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON test_transactions TO authenticated;
GRANT INSERT ON test_transactions TO service_role;
GRANT ALL ON test_transactions TO service_role;
