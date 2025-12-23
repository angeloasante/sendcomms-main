-- Create sms_logs table to track all SMS messages sent through the API
CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_id VARCHAR(255),
    message_id VARCHAR(255), -- Provider's message ID (Twilio SID or Termii message_id)
    reference VARCHAR(255), -- Customer's reference
    
    -- Recipient details
    phone_number VARCHAR(50) NOT NULL,
    country_code VARCHAR(5),
    country_name VARCHAR(100),
    continent VARCHAR(50), -- 'africa', 'north_america', 'europe', 'asia', 'oceania', 'global'
    
    -- Message details
    message_content TEXT,
    sender_id VARCHAR(50), -- Sender ID or phone number
    segments INTEGER DEFAULT 1,
    
    -- Provider info
    provider VARCHAR(50) NOT NULL, -- 'twilio' or 'termii'
    
    -- Pricing
    cost DECIMAL(10, 6), -- Our cost from provider
    price DECIMAL(10, 6), -- Amount charged to customer
    currency VARCHAR(10) DEFAULT 'USD',
    
    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- Possible statuses: pending, sent, delivered, failed, undelivered
    
    -- Delivery tracking
    delivered_at TIMESTAMPTZ,
    delivery_status VARCHAR(50),
    
    -- API info
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Error info (if failed)
    error_code VARCHAR(100),
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_sms_logs_customer_id ON sms_logs(customer_id);
CREATE INDEX idx_sms_logs_status ON sms_logs(status);
CREATE INDEX idx_sms_logs_created_at ON sms_logs(created_at DESC);
CREATE INDEX idx_sms_logs_phone_number ON sms_logs(phone_number);
CREATE INDEX idx_sms_logs_transaction_id ON sms_logs(transaction_id);
CREATE INDEX idx_sms_logs_message_id ON sms_logs(message_id);
CREATE INDEX idx_sms_logs_reference ON sms_logs(reference);
CREATE INDEX idx_sms_logs_api_key_id ON sms_logs(api_key_id);
CREATE INDEX idx_sms_logs_provider ON sms_logs(provider);
CREATE INDEX idx_sms_logs_country_code ON sms_logs(country_code);
CREATE INDEX idx_sms_logs_continent ON sms_logs(continent);

-- Add RLS policies
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- Customers can only see their own SMS logs
CREATE POLICY "Customers can view their own sms logs"
    ON sms_logs FOR SELECT
    USING (
        customer_id IN (
            SELECT id FROM customers WHERE auth_user_id = auth.uid()
        )
    );

-- Allow insert from service role (API)
CREATE POLICY "Service role can insert sms logs"
    ON sms_logs FOR INSERT
    WITH CHECK (true);

-- Allow update from service role (for status updates)
CREATE POLICY "Service role can update sms logs"
    ON sms_logs FOR UPDATE
    USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sms_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS sms_logs_updated_at_trigger ON sms_logs;
CREATE TRIGGER sms_logs_updated_at_trigger
    BEFORE UPDATE ON sms_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_sms_logs_updated_at();

-- Grant permissions
GRANT ALL ON sms_logs TO service_role;
GRANT SELECT ON sms_logs TO authenticated;
