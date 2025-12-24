-- Migration: 010_billing_system.sql
-- Description: Create billing tables for subscriptions, invoices, and pricing plans
-- Date: 2024-12-24

-- Pricing Plans Table (stores plan configurations)
CREATE TABLE IF NOT EXISTS pricing_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Service limits per month
    sms_limit INTEGER DEFAULT 0,
    email_limit INTEGER DEFAULT 0,
    data_limit_gb DECIMAL(10, 2) DEFAULT 0,
    airtime_limit_ghs DECIMAL(10, 2) DEFAULT 0,
    
    -- Rate limits
    api_calls_per_minute INTEGER DEFAULT 10,
    api_calls_per_hour INTEGER DEFAULT 100,
    api_calls_per_day INTEGER DEFAULT 1000,
    api_calls_per_month INTEGER DEFAULT 10000,
    
    -- Service-specific rate limits (per minute / per day)
    sms_per_minute INTEGER DEFAULT 5,
    sms_per_day INTEGER DEFAULT 100,
    email_per_minute INTEGER DEFAULT 10,
    email_per_day INTEGER DEFAULT 500,
    airtime_per_minute INTEGER DEFAULT 2,
    airtime_per_day INTEGER DEFAULT 50,
    data_per_minute INTEGER DEFAULT 2,
    data_per_day INTEGER DEFAULT 50,
    
    -- Features (JSON for flexibility)
    features JSONB DEFAULT '{}',
    
    -- SLA
    uptime_sla VARCHAR(10) DEFAULT NULL,
    
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions Table (tracks customer's current plan)
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES pricing_plans(id),
    
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'paused')),
    billing_cycle VARCHAR(10) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    
    -- Billing dates
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Usage tracking for current period
    sms_used INTEGER DEFAULT 0,
    email_used INTEGER DEFAULT 0,
    data_used_mb DECIMAL(10, 2) DEFAULT 0,
    airtime_used_ghs DECIMAL(10, 2) DEFAULT 0,
    
    -- Payment provider info
    stripe_subscription_id VARCHAR(255),
    paystack_subscription_code VARCHAR(255),
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(customer_id) -- One active subscription per customer
);

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(20) UNIQUE NOT NULL, -- INV-2024-001
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'paid', 'unpaid', 'overdue', 'cancelled', 'refunded')),
    
    -- Amounts
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(10, 2) DEFAULT 0,
    amount_due DECIMAL(10, 2) GENERATED ALWAYS AS (total - amount_paid) STORED,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Plan info at time of invoice
    plan_name VARCHAR(100),
    billing_cycle VARCHAR(10),
    
    -- Dates
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Usage summary for the period
    usage_summary JSONB DEFAULT '{}',
    
    -- Line items
    line_items JSONB DEFAULT '[]',
    
    -- Payment info
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    paystack_reference VARCHAR(255),
    
    -- PDF storage
    pdf_url TEXT,
    
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment Methods Table
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    type VARCHAR(20) NOT NULL CHECK (type IN ('card', 'mobile_money', 'bank_transfer')),
    provider VARCHAR(50), -- stripe, paystack, mtn, vodafone, etc.
    
    -- Card details (masked)
    card_brand VARCHAR(20), -- visa, mastercard, etc.
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    
    -- Mobile money
    mobile_number VARCHAR(20),
    mobile_network VARCHAR(50),
    
    -- Bank
    bank_name VARCHAR(100),
    account_last4 VARCHAR(4),
    
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Provider references
    stripe_payment_method_id VARCHAR(255),
    paystack_authorization_code VARCHAR(255),
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default pricing plans matching landing page
INSERT INTO pricing_plans (
    name, display_name, description,
    price_monthly, price_yearly,
    sms_limit, email_limit, data_limit_gb, airtime_limit_ghs,
    api_calls_per_minute, api_calls_per_hour, api_calls_per_day, api_calls_per_month,
    sms_per_minute, sms_per_day, email_per_minute, email_per_day,
    airtime_per_minute, airtime_per_day, data_per_minute, data_per_day,
    features, uptime_sla, sort_order
) VALUES
-- Free Plan
(
    'free', 'Free Plan', 'Perfect for testing and small projects.',
    0, 0,
    50, 500, 1, 10,
    10, 100, 1000, 10000,
    5, 50, 10, 500, 2, 50, 2, 50,
    '{"sandbox": "unlimited", "support": "community", "branding": true}'::jsonb,
    NULL, 0
),
-- Starter Plan
(
    'starter', 'Starter Plan', 'Ideal for startups launching their services.',
    29, 279,
    300, 2000, 5, 30,
    100, 1000, 10000, 100000,
    50, 300, 100, 2000, 20, 300, 20, 300,
    '{"sandbox": "unlimited", "support": "email", "branding": false, "remove_branding": true, "uptime_sla": "99.9%"}'::jsonb,
    '99.9%', 1
),
-- Pro Plan
(
    'pro', 'Pro Plan', 'Perfect for growing businesses.',
    99, 950,
    1500, 10000, 30, 150,
    500, 5000, 50000, 500000,
    200, 1500, 500, 10000, 100, 1500, 100, 1500,
    '{"sandbox": "unlimited", "support": "priority", "branding": false, "remove_branding": true, "webhooks": true, "slack_channel": true, "uptime_sla": "99.9%"}'::jsonb,
    '99.9%', 2
),
-- Business Plan
(
    'business', 'Business Plan', 'High-volume for established businesses.',
    299, 2870,
    6000, 40000, 150, 600,
    1000, 10000, 100000, 1000000,
    500, 6000, 1000, 40000, 200, 6000, 200, 6000,
    '{"sandbox": "unlimited", "support": "phone", "branding": false, "remove_branding": true, "webhooks": true, "slack_channel": true, "account_manager": true, "custom_sla": true, "business_reviews": "quarterly"}'::jsonb,
    'Custom', 3
),
-- Enterprise Plan
(
    'enterprise', 'Enterprise Plan', 'Tailored for large organizations.',
    0, 0,
    0, 0, 0, 0, -- Custom limits
    10000, 100000, 1000000, 10000000,
    5000, 100000, 10000, 500000, 2000, 50000, 2000, 50000,
    '{"sandbox": "unlimited", "support": "dedicated", "branding": false, "remove_branding": true, "webhooks": true, "slack_channel": true, "account_manager": true, "custom_sla": true, "business_reviews": "monthly", "dedicated_infrastructure": true, "legal_review": true}'::jsonb,
    '99.99%', 4
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    sms_limit = EXCLUDED.sms_limit,
    email_limit = EXCLUDED.email_limit,
    data_limit_gb = EXCLUDED.data_limit_gb,
    airtime_limit_ghs = EXCLUDED.airtime_limit_ghs,
    api_calls_per_minute = EXCLUDED.api_calls_per_minute,
    api_calls_per_hour = EXCLUDED.api_calls_per_hour,
    api_calls_per_day = EXCLUDED.api_calls_per_day,
    api_calls_per_month = EXCLUDED.api_calls_per_month,
    sms_per_minute = EXCLUDED.sms_per_minute,
    sms_per_day = EXCLUDED.sms_per_day,
    email_per_minute = EXCLUDED.email_per_minute,
    email_per_day = EXCLUDED.email_per_day,
    features = EXCLUDED.features,
    uptime_sla = EXCLUDED.uptime_sla,
    updated_at = NOW();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_payment_methods_customer ON payment_methods(customer_id);

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
        LPAD(NEXTVAL('invoice_number_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- Trigger to auto-generate invoice number
DROP TRIGGER IF EXISTS set_invoice_number ON invoices;
CREATE TRIGGER set_invoice_number
    BEFORE INSERT ON invoices
    FOR EACH ROW
    WHEN (NEW.invoice_number IS NULL)
    EXECUTE FUNCTION generate_invoice_number();

-- Function to reset usage at period end
CREATE OR REPLACE FUNCTION reset_subscription_usage()
RETURNS void AS $$
BEGIN
    UPDATE subscriptions
    SET 
        sms_used = 0,
        email_used = 0,
        data_used_mb = 0,
        airtime_used_ghs = 0,
        current_period_start = NOW(),
        current_period_end = CASE 
            WHEN billing_cycle = 'monthly' THEN NOW() + INTERVAL '1 month'
            ELSE NOW() + INTERVAL '1 year'
        END,
        updated_at = NOW()
    WHERE current_period_end < NOW() AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_usage(
    p_customer_id UUID,
    p_service VARCHAR(20),
    p_amount DECIMAL DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
    v_subscription subscriptions%ROWTYPE;
    v_plan pricing_plans%ROWTYPE;
BEGIN
    -- Get subscription
    SELECT * INTO v_subscription FROM subscriptions WHERE customer_id = p_customer_id AND status = 'active';
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Get plan limits
    SELECT * INTO v_plan FROM pricing_plans WHERE id = v_subscription.plan_id;
    
    -- Update usage based on service
    CASE p_service
        WHEN 'sms' THEN
            UPDATE subscriptions SET sms_used = sms_used + p_amount, updated_at = NOW()
            WHERE id = v_subscription.id;
        WHEN 'email' THEN
            UPDATE subscriptions SET email_used = email_used + p_amount, updated_at = NOW()
            WHERE id = v_subscription.id;
        WHEN 'data' THEN
            UPDATE subscriptions SET data_used_mb = data_used_mb + p_amount, updated_at = NOW()
            WHERE id = v_subscription.id;
        WHEN 'airtime' THEN
            UPDATE subscriptions SET airtime_used_ghs = airtime_used_ghs + p_amount, updated_at = NOW()
            WHERE id = v_subscription.id;
    END CASE;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Pricing plans are readable by everyone
CREATE POLICY "Pricing plans are viewable by everyone" ON pricing_plans
    FOR SELECT USING (true);

-- Subscriptions only viewable by owner
CREATE POLICY "Users can view own subscription" ON subscriptions
    FOR SELECT USING (customer_id = auth.uid());

-- Invoices only viewable by owner
CREATE POLICY "Users can view own invoices" ON invoices
    FOR SELECT USING (customer_id = auth.uid());

-- Payment methods only viewable by owner
CREATE POLICY "Users can view own payment methods" ON payment_methods
    FOR SELECT USING (customer_id = auth.uid());

COMMENT ON TABLE pricing_plans IS 'Stores pricing plan configurations matching landing page';
COMMENT ON TABLE subscriptions IS 'Tracks customer subscriptions and current usage';
COMMENT ON TABLE invoices IS 'Billing invoices for customers';
COMMENT ON TABLE payment_methods IS 'Stored payment methods for customers';
