-- Migration 015: request_attempts
-- One row per authenticated API call, written immediately after API-key
-- validation and BEFORE anything that can fail (rate limit, body parse,
-- provider call...). Finalised with the outcome when the response is sent.
-- Answers "who called, what endpoint, and what happened" for every request.

CREATE TABLE IF NOT EXISTS request_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    endpoint TEXT NOT NULL,                -- e.g. /api/v1/sms/send
    method VARCHAR(10) NOT NULL,
    service VARCHAR(20),                   -- sms | email | data | airtime | usage | webhooks
    sandbox BOOLEAN NOT NULL DEFAULT false,
    outcome VARCHAR(30) NOT NULL DEFAULT 'started',
        -- started | success | client_error | rate_limited | provider_error | internal_error | unauthorized
    status_code INTEGER,
    error_code VARCHAR(60),                -- our API error code (e.g. INVALID_PHONE_NUMBER)
    error_message TEXT,                    -- sanitised, short
    transaction_id VARCHAR(100),           -- set once a transaction row exists
    request_summary JSONB DEFAULT '{}',    -- redacted: destination, reference, sizes - never message bodies
    ip_address INET,
    user_agent TEXT,
    duration_ms INTEGER,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_request_attempts_customer ON request_attempts(customer_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_attempts_outcome ON request_attempts(outcome, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_attempts_started ON request_attempts(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_attempts_endpoint ON request_attempts(endpoint, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_attempts_transaction ON request_attempts(transaction_id) WHERE transaction_id IS NOT NULL;

ALTER TABLE request_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to request_attempts" ON request_attempts
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Customers can view own request attempts" ON request_attempts
    FOR SELECT USING (
        customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
    );

COMMENT ON TABLE request_attempts IS 'Audit row for every authenticated API request, written before any fallible step.';
