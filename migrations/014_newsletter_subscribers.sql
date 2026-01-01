-- Newsletter Subscribers Table
-- This table stores email addresses of users who subscribe to the newsletter

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    subscribed BOOLEAN DEFAULT true,
    source VARCHAR(50) DEFAULT 'website', -- 'website', 'signup', 'import', etc.
    
    -- Tracking dates
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    resubscribed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    
    -- Standard timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribed ON newsletter_subscribers(subscribed);
CREATE INDEX IF NOT EXISTS idx_newsletter_source ON newsletter_subscribers(source);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribed_at ON newsletter_subscribers(subscribed_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_newsletter_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS newsletter_updated_at ON newsletter_subscribers;
CREATE TRIGGER newsletter_updated_at
    BEFORE UPDATE ON newsletter_subscribers
    FOR EACH ROW
    EXECUTE FUNCTION update_newsletter_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY "Service role has full access to newsletter_subscribers"
ON newsletter_subscribers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Anon users can insert (subscribe)
CREATE POLICY "Anon users can subscribe to newsletter"
ON newsletter_subscribers
FOR INSERT
TO anon
WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE newsletter_subscribers IS 'Stores email addresses of newsletter subscribers';
COMMENT ON COLUMN newsletter_subscribers.email IS 'The subscriber email address';
COMMENT ON COLUMN newsletter_subscribers.subscribed IS 'Whether the user is currently subscribed';
COMMENT ON COLUMN newsletter_subscribers.source IS 'Where the subscription came from (website, signup form, import, etc.)';
COMMENT ON COLUMN newsletter_subscribers.subscribed_at IS 'When the user first subscribed';
COMMENT ON COLUMN newsletter_subscribers.unsubscribed_at IS 'When the user unsubscribed (if applicable)';
COMMENT ON COLUMN newsletter_subscribers.resubscribed_at IS 'When the user re-subscribed after unsubscribing';
