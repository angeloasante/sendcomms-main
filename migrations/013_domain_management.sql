-- Domain Management Migration
-- Tracks customer domains synced with Resend

-- Customer domains table
-- Stores domain information linked to Resend domains API
CREATE TABLE IF NOT EXISTS customer_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Resend domain data
    resend_domain_id VARCHAR(255) UNIQUE NOT NULL, -- Domain ID from Resend API
    name VARCHAR(255) NOT NULL, -- Domain name (e.g., example.com)
    status VARCHAR(50) NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'pending', 'verified', 'failed', 'temporary_failure')),
    region VARCHAR(50) DEFAULT 'us-east-1' CHECK (region IN ('us-east-1', 'eu-west-1', 'sa-east-1', 'ap-northeast-1')),
    
    -- Domain settings
    custom_return_path VARCHAR(63),
    open_tracking BOOLEAN DEFAULT false,
    click_tracking BOOLEAN DEFAULT false,
    tls VARCHAR(20) DEFAULT 'opportunistic' CHECK (tls IN ('opportunistic', 'enforced')),
    
    -- Capabilities
    sending_enabled BOOLEAN DEFAULT true,
    receiving_enabled BOOLEAN DEFAULT false,
    
    -- DNS records stored as JSONB for flexibility
    dns_records JSONB DEFAULT '[]',
    
    -- Metadata
    is_primary BOOLEAN DEFAULT false, -- Primary sending domain for customer
    is_active BOOLEAN DEFAULT true,
    verified_at TIMESTAMP WITH TIME ZONE,
    last_checked_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique domain per customer
    CONSTRAINT unique_domain_per_customer UNIQUE (customer_id, name)
);

-- Domain verification history
-- Tracks verification attempts and status changes
CREATE TABLE IF NOT EXISTS domain_verification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_id UUID NOT NULL REFERENCES customer_domains(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    triggered_by VARCHAR(50) DEFAULT 'manual', -- manual, auto, webhook
    
    -- Record status at time of verification
    spf_status VARCHAR(50),
    dkim_status VARCHAR(50),
    
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Domain email stats (aggregate per domain)
-- For tracking sending reputation per domain
CREATE TABLE IF NOT EXISTS domain_email_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_id UUID NOT NULL REFERENCES customer_domains(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Date for daily aggregation
    stat_date DATE NOT NULL,
    
    -- Email counts
    emails_sent INTEGER DEFAULT 0,
    emails_delivered INTEGER DEFAULT 0,
    emails_bounced INTEGER DEFAULT 0,
    emails_complained INTEGER DEFAULT 0,
    emails_opened INTEGER DEFAULT 0,
    emails_clicked INTEGER DEFAULT 0,
    
    -- Calculated rates (stored for quick access)
    delivery_rate DECIMAL(5,2),
    bounce_rate DECIMAL(5,2),
    complaint_rate DECIMAL(5,2),
    open_rate DECIMAL(5,2),
    click_rate DECIMAL(5,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One entry per domain per day
    CONSTRAINT unique_domain_stat_date UNIQUE (domain_id, stat_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_domains_customer ON customer_domains(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_domains_resend_id ON customer_domains(resend_domain_id);
CREATE INDEX IF NOT EXISTS idx_customer_domains_name ON customer_domains(name);
CREATE INDEX IF NOT EXISTS idx_customer_domains_status ON customer_domains(status);
CREATE INDEX IF NOT EXISTS idx_customer_domains_primary ON customer_domains(customer_id, is_primary) WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_domain_verification_logs_domain ON domain_verification_logs(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_verification_logs_customer ON domain_verification_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_domain_verification_logs_created ON domain_verification_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_domain_email_stats_domain ON domain_email_stats(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_email_stats_customer ON domain_email_stats(customer_id);
CREATE INDEX IF NOT EXISTS idx_domain_email_stats_date ON domain_email_stats(stat_date DESC);

-- Trigger to update updated_at
CREATE TRIGGER update_customer_domains_updated_at
    BEFORE UPDATE ON customer_domains
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_domain_email_stats_updated_at
    BEFORE UPDATE ON domain_email_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE customer_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_email_stats ENABLE ROW LEVEL SECURITY;

-- Service role full access policies
CREATE POLICY "Service role full access to customer_domains" ON customer_domains
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to domain_verification_logs" ON domain_verification_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to domain_email_stats" ON domain_email_stats
    FOR ALL USING (auth.role() = 'service_role');

-- Function to set primary domain (ensures only one primary per customer)
CREATE OR REPLACE FUNCTION set_primary_domain(p_domain_id UUID, p_customer_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Remove primary flag from all other domains for this customer
    UPDATE customer_domains 
    SET is_primary = false, updated_at = NOW()
    WHERE customer_id = p_customer_id AND is_primary = true;
    
    -- Set the specified domain as primary
    UPDATE customer_domains 
    SET is_primary = true, updated_at = NOW()
    WHERE id = p_domain_id AND customer_id = p_customer_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update domain stats
CREATE OR REPLACE FUNCTION update_domain_email_stats(
    p_domain_id UUID,
    p_customer_id UUID,
    p_sent INTEGER DEFAULT 0,
    p_delivered INTEGER DEFAULT 0,
    p_bounced INTEGER DEFAULT 0,
    p_complained INTEGER DEFAULT 0,
    p_opened INTEGER DEFAULT 0,
    p_clicked INTEGER DEFAULT 0
)
RETURNS VOID AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_total_sent INTEGER;
    v_delivery_rate DECIMAL(5,2);
    v_bounce_rate DECIMAL(5,2);
    v_complaint_rate DECIMAL(5,2);
    v_open_rate DECIMAL(5,2);
    v_click_rate DECIMAL(5,2);
BEGIN
    -- Insert or update stats for today
    INSERT INTO domain_email_stats (
        domain_id, customer_id, stat_date,
        emails_sent, emails_delivered, emails_bounced,
        emails_complained, emails_opened, emails_clicked
    ) VALUES (
        p_domain_id, p_customer_id, v_today,
        p_sent, p_delivered, p_bounced,
        p_complained, p_opened, p_clicked
    )
    ON CONFLICT (domain_id, stat_date) DO UPDATE SET
        emails_sent = domain_email_stats.emails_sent + p_sent,
        emails_delivered = domain_email_stats.emails_delivered + p_delivered,
        emails_bounced = domain_email_stats.emails_bounced + p_bounced,
        emails_complained = domain_email_stats.emails_complained + p_complained,
        emails_opened = domain_email_stats.emails_opened + p_opened,
        emails_clicked = domain_email_stats.emails_clicked + p_clicked,
        updated_at = NOW();
    
    -- Get updated totals and calculate rates
    SELECT 
        emails_sent,
        CASE WHEN emails_sent > 0 THEN ROUND((emails_delivered::DECIMAL / emails_sent) * 100, 2) ELSE 0 END,
        CASE WHEN emails_sent > 0 THEN ROUND((emails_bounced::DECIMAL / emails_sent) * 100, 2) ELSE 0 END,
        CASE WHEN emails_sent > 0 THEN ROUND((emails_complained::DECIMAL / emails_sent) * 100, 2) ELSE 0 END,
        CASE WHEN emails_delivered > 0 THEN ROUND((emails_opened::DECIMAL / emails_delivered) * 100, 2) ELSE 0 END,
        CASE WHEN emails_opened > 0 THEN ROUND((emails_clicked::DECIMAL / emails_opened) * 100, 2) ELSE 0 END
    INTO v_total_sent, v_delivery_rate, v_bounce_rate, v_complaint_rate, v_open_rate, v_click_rate
    FROM domain_email_stats
    WHERE domain_id = p_domain_id AND stat_date = v_today;
    
    -- Update calculated rates
    UPDATE domain_email_stats SET
        delivery_rate = v_delivery_rate,
        bounce_rate = v_bounce_rate,
        complaint_rate = v_complaint_rate,
        open_rate = v_open_rate,
        click_rate = v_click_rate
    WHERE domain_id = p_domain_id AND stat_date = v_today;
END;
$$ LANGUAGE plpgsql;

-- Log domain status change
CREATE OR REPLACE FUNCTION log_domain_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO domain_verification_logs (
            domain_id, customer_id, previous_status, new_status, triggered_by
        ) VALUES (
            NEW.id, NEW.customer_id, OLD.status, NEW.status, 'auto'
        );
        
        -- Update verified_at if newly verified
        IF NEW.status = 'verified' AND OLD.status != 'verified' THEN
            NEW.verified_at = NOW();
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_domain_status_change
    BEFORE UPDATE ON customer_domains
    FOR EACH ROW
    EXECUTE FUNCTION log_domain_status_change();
