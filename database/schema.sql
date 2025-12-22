-- SendComms Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    plan VARCHAR(50) DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise', 'prepaid')),
    balance DECIMAL(10, 4) DEFAULT 0.00,
    webhook_url TEXT,
    webhook_secret VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    key_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA256 hash of the API key
    name VARCHAR(255) DEFAULT 'Default Key',
    permissions TEXT[] DEFAULT ARRAY['email', 'sms', 'airtime', 'data'],
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table (all API calls)
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(50) PRIMARY KEY, -- txn_xxx format
    customer_id UUID NOT NULL REFERENCES customers(id),
    api_key_id UUID REFERENCES api_keys(id),
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'email_batch', 'sms', 'airtime', 'data')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'complained', 'delayed')),
    provider VARCHAR(50), -- resend, termii, reloadly
    provider_id VARCHAR(255), -- ID from the provider
    destination VARCHAR(255), -- email address, phone number
    recipient_count INTEGER DEFAULT 1,
    request_data JSONB,
    response_data JSONB,
    webhook_data JSONB,
    cost DECIMAL(10, 4), -- What we pay
    price DECIMAL(10, 4), -- What we charge
    margin DECIMAL(10, 4), -- Profit
    currency VARCHAR(3) DEFAULT 'USD',
    idempotency_key VARCHAR(255),
    failure_reason TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Usage logs table (for analytics)
CREATE TABLE IF NOT EXISTS usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    api_key_id UUID REFERENCES api_keys(id),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) DEFAULT 'POST',
    status_code INTEGER,
    response_time_ms INTEGER,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id VARCHAR(50) REFERENCES transactions(id),
    customer_id UUID REFERENCES customers(id),
    provider VARCHAR(50),
    url TEXT,
    event_type VARCHAR(100),
    payload JSONB,
    status_code INTEGER,
    success BOOLEAN DEFAULT false,
    error TEXT,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    received_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_idempotency ON transactions(customer_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_transactions_provider_id ON transactions(provider_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_customer ON api_keys(customer_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

CREATE INDEX IF NOT EXISTS idx_usage_logs_customer ON usage_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_timestamp ON usage_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_transaction ON webhook_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_customer ON webhook_logs(customer_id);

-- Function to deduct balance atomically
CREATE OR REPLACE FUNCTION deduct_balance(p_customer_id UUID, p_amount DECIMAL)
RETURNS VOID AS $$
BEGIN
    UPDATE customers 
    SET balance = balance - p_amount,
        updated_at = NOW()
    WHERE id = p_customer_id 
    AND balance >= p_amount;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to add balance
CREATE OR REPLACE FUNCTION add_balance(p_customer_id UUID, p_amount DECIMAL)
RETURNS VOID AS $$
BEGIN
    UPDATE customers 
    SET balance = balance + p_amount,
        updated_at = NOW()
    WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Service role can access everything (for API)
CREATE POLICY "Service role full access to customers" ON customers
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to api_keys" ON api_keys
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to transactions" ON transactions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to usage_logs" ON usage_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to webhook_logs" ON webhook_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Sample data for testing (optional)
-- INSERT INTO customers (email, name, plan) VALUES ('test@example.com', 'Test User', 'free');
