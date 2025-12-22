-- Create data_logs table to track all data bundle purchases through the API
CREATE TABLE IF NOT EXISTS data_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_id VARCHAR(255), -- From provider (e.g., Reloadly transaction ID)
    reference VARCHAR(255), -- Customer's reference
    
    -- Recipient details
    phone_number VARCHAR(50) NOT NULL,
    country_code VARCHAR(5),
    country_name VARCHAR(100),
    operator_id VARCHAR(50),
    operator_name VARCHAR(100),
    
    -- Package details
    package_id VARCHAR(100),
    package_name VARCHAR(255),
    data_amount VARCHAR(50), -- e.g., "1GB", "500MB"
    validity VARCHAR(100), -- e.g., "30 days", "7 days"
    
    -- Pricing
    amount DECIMAL(10, 4) NOT NULL, -- Amount charged to customer
    cost DECIMAL(10, 4), -- Our cost from provider
    currency VARCHAR(10) DEFAULT 'USD',
    
    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- Possible statuses: pending, processing, successful, failed, refunded
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- API info
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Provider response
    provider_response JSONB DEFAULT '{}'::jsonb,
    
    -- Error info (if failed)
    error_code VARCHAR(100),
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ
);

-- Create indexes for common queries
CREATE INDEX idx_data_logs_customer_id ON data_logs(customer_id);
CREATE INDEX idx_data_logs_status ON data_logs(status);
CREATE INDEX idx_data_logs_created_at ON data_logs(created_at DESC);
CREATE INDEX idx_data_logs_phone_number ON data_logs(phone_number);
CREATE INDEX idx_data_logs_transaction_id ON data_logs(transaction_id);
CREATE INDEX idx_data_logs_reference ON data_logs(reference);
CREATE INDEX idx_data_logs_api_key_id ON data_logs(api_key_id);
CREATE INDEX idx_data_logs_operator_name ON data_logs(operator_name);
CREATE INDEX idx_data_logs_country_code ON data_logs(country_code);

-- Add RLS policies
ALTER TABLE data_logs ENABLE ROW LEVEL SECURITY;

-- Customers can only see their own data logs
CREATE POLICY "Customers can view their own data logs"
    ON data_logs FOR SELECT
    USING (customer_id IN (
        SELECT id FROM customers WHERE auth_user_id = auth.uid()
    ));

-- Only service role can insert/update (API handles this)
CREATE POLICY "Service role can manage data logs"
    ON data_logs FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create data_stats view for quick analytics
CREATE OR REPLACE VIEW data_stats AS
SELECT 
    customer_id,
    COUNT(*) as total_purchases,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
    COUNT(*) FILTER (WHERE status = 'successful') as successful_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE status = 'refunded') as refunded_count,
    SUM(amount) FILTER (WHERE status = 'successful') as total_amount,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as last_24h_count,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_7d_count,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as last_30d_count
FROM data_logs
GROUP BY customer_id;

-- Comment on table
COMMENT ON TABLE data_logs IS 'Stores all data bundle purchases made through the SendComms API for tracking and analytics';
