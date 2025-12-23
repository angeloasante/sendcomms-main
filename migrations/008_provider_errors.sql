-- Provider Errors Tracking Table
-- Migration: 008_provider_errors.sql
-- 
-- This table tracks all provider-related errors for:
-- - Debugging and incident investigation
-- - Provider reliability monitoring
-- - Error pattern analysis
-- - Audit trail for failed transactions

-- Create the provider_errors table
CREATE TABLE IF NOT EXISTS provider_errors (
  -- Primary key
  id TEXT PRIMARY KEY,  -- Format: err_{timestamp}_{random}
  
  -- Service identification
  service TEXT NOT NULL,  -- 'email', 'sms', 'data', 'airtime'
  provider TEXT NOT NULL, -- 'twilio', 'resend', 'datamart', 'reloadly', 'termii', 'hubtel'
  
  -- Customer/Transaction context
  customer_id UUID REFERENCES customers(id),
  transaction_id TEXT,
  
  -- Error details
  error_type TEXT NOT NULL,      -- 'ProviderError', 'SystemError', etc.
  error_message TEXT NOT NULL,   -- Human-readable error message
  error_details JSONB,           -- Full error object (sanitized)
  
  -- Classification
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  retryable BOOLEAN DEFAULT false,
  
  -- Request context (for debugging)
  request_data JSONB,
  
  -- Escalation tracking
  escalated BOOLEAN DEFAULT false,
  escalated_at TIMESTAMPTZ,
  escalation_channels TEXT[],  -- ['sms', 'email', 'slack']
  
  -- Resolution tracking
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,           -- Admin user who resolved
  resolution_notes TEXT,
  resolution_action TEXT,     -- 'retry', 'refund', 'ignore', etc.
  
  -- Retry tracking
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
-- 1. Query unresolved errors (for dashboard)
CREATE INDEX idx_provider_errors_unresolved 
  ON provider_errors(severity DESC, created_at DESC) 
  WHERE resolved = false;

-- 2. Query by severity (for alerts dashboard)
CREATE INDEX idx_provider_errors_severity 
  ON provider_errors(severity, created_at DESC);

-- 3. Query by provider (for provider health monitoring)
CREATE INDEX idx_provider_errors_provider 
  ON provider_errors(provider, created_at DESC);

-- 4. Query by service (for service health)
CREATE INDEX idx_provider_errors_service 
  ON provider_errors(service, created_at DESC);

-- 5. Query by customer (for customer support)
CREATE INDEX idx_provider_errors_customer 
  ON provider_errors(customer_id, created_at DESC);

-- 6. Query by transaction (for transaction lookup)
CREATE INDEX idx_provider_errors_transaction 
  ON provider_errors(transaction_id) 
  WHERE transaction_id IS NOT NULL;

-- 7. Time-based queries (for reports)
CREATE INDEX idx_provider_errors_created_at 
  ON provider_errors(created_at DESC);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_provider_errors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
CREATE TRIGGER trigger_provider_errors_updated_at
  BEFORE UPDATE ON provider_errors
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_errors_updated_at();

-- Enable Row Level Security
ALTER TABLE provider_errors ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY "Service role has full access to provider_errors"
  ON provider_errors
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE provider_errors IS 'Tracks all provider-related errors for debugging, monitoring, and audit';
COMMENT ON COLUMN provider_errors.id IS 'Unique error ID in format err_{timestamp}_{random}';
COMMENT ON COLUMN provider_errors.service IS 'Service that triggered the error: email, sms, data, airtime';
COMMENT ON COLUMN provider_errors.provider IS 'External provider that returned the error';
COMMENT ON COLUMN provider_errors.severity IS 'Error severity: low, medium, high, critical';
COMMENT ON COLUMN provider_errors.retryable IS 'Whether the operation can be retried';
COMMENT ON COLUMN provider_errors.escalated IS 'Whether admin has been notified';
COMMENT ON COLUMN provider_errors.resolved IS 'Whether the error has been investigated and resolved';
COMMENT ON COLUMN provider_errors.resolution_action IS 'What action was taken: retry, refund, ignore, etc.';

-- Sample queries for reference:

-- Get all unresolved critical errors
-- SELECT * FROM provider_errors 
-- WHERE resolved = false AND severity = 'critical'
-- ORDER BY created_at DESC;

-- Get error counts by provider in last 24h
-- SELECT provider, severity, COUNT(*) 
-- FROM provider_errors 
-- WHERE created_at > NOW() - INTERVAL '24 hours'
-- GROUP BY provider, severity
-- ORDER BY COUNT(*) DESC;

-- Get error rate by service
-- SELECT service, 
--        COUNT(*) as total_errors,
--        COUNT(*) FILTER (WHERE severity = 'critical') as critical_errors
-- FROM provider_errors 
-- WHERE created_at > NOW() - INTERVAL '1 hour'
-- GROUP BY service;
