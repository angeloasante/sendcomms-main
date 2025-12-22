-- Create email_logs table to track all emails sent through the API
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Email details
    message_id VARCHAR(255), -- From email provider (e.g., Resend message ID)
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(255),
    reply_to VARCHAR(255),
    
    -- Content
    subject VARCHAR(500) NOT NULL,
    html_content TEXT,
    text_content TEXT,
    
    -- Attachments info (stored as JSON array)
    attachments JSONB DEFAULT '[]'::jsonb,
    
    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    -- Possible statuses: queued, sent, delivered, opened, clicked, bounced, complained, failed
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- API info
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Webhook events (stored as array of events with timestamps)
    events JSONB DEFAULT '[]'::jsonb,
    
    -- Error info (if failed)
    error_code VARCHAR(100),
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    
    -- Batch reference (for batch sends)
    batch_id UUID,
    batch_index INT
);

-- Create indexes for common queries
CREATE INDEX idx_email_logs_customer_id ON email_logs(customer_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX idx_email_logs_to_email ON email_logs(to_email);
CREATE INDEX idx_email_logs_from_email ON email_logs(from_email);
CREATE INDEX idx_email_logs_message_id ON email_logs(message_id);
CREATE INDEX idx_email_logs_batch_id ON email_logs(batch_id);
CREATE INDEX idx_email_logs_api_key_id ON email_logs(api_key_id);

-- Add RLS policies
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Customers can only see their own email logs
CREATE POLICY "Customers can view their own email logs"
    ON email_logs FOR SELECT
    USING (customer_id IN (
        SELECT id FROM customers WHERE auth_user_id = auth.uid()
    ));

-- Only service role can insert/update (API handles this)
CREATE POLICY "Service role can manage email logs"
    ON email_logs FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create email_stats view for quick analytics
CREATE OR REPLACE VIEW email_stats AS
SELECT 
    customer_id,
    COUNT(*) as total_emails,
    COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
    COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
    COUNT(*) FILTER (WHERE status = 'opened') as opened_count,
    COUNT(*) FILTER (WHERE status = 'clicked') as clicked_count,
    COUNT(*) FILTER (WHERE status = 'bounced') as bounced_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as last_24h_count,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_7d_count,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as last_30d_count
FROM email_logs
GROUP BY customer_id;

-- Comment on table
COMMENT ON TABLE email_logs IS 'Stores all emails sent through the SendComms API for tracking and analytics';
