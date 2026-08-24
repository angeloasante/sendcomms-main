-- Migration 020: customer sender IDs (alphanumeric SMS "from" names)
--
-- Sender IDs are registered with the carrier on OUR provider account, so the
-- provider has no idea which SendComms customer owns which name. Without a
-- record here, one customer could send under another's brand. Ownership is
-- therefore tracked and globally unique, exactly like customer_domains.
--
-- Registration is asynchronous: Ghanaian carriers approve sender IDs manually
-- and it can take weeks, so `status` is polled/refreshed rather than assumed.

CREATE TABLE IF NOT EXISTS sender_ids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    sender_id VARCHAR(11) NOT NULL,              -- carrier limit is 11 characters
    purpose TEXT,                                 -- why it is being registered (carriers require this)
    provider VARCHAR(20) NOT NULL DEFAULT 'bms',
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    provider_response JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_checked_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sender_ids_customer ON sender_ids(customer_id, is_active);
CREATE INDEX IF NOT EXISTS idx_sender_ids_status ON sender_ids(status);

-- One owner per sender ID, enforced in the database so two concurrent
-- registrations cannot both succeed.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_sender_ids_active_name
    ON sender_ids (lower(sender_id))
    WHERE is_active;

ALTER TABLE sender_ids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to sender_ids" ON sender_ids;
CREATE POLICY "Service role full access to sender_ids" ON sender_ids
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Customers can view own sender ids" ON sender_ids;
CREATE POLICY "Customers can view own sender ids" ON sender_ids
    FOR SELECT USING (
        customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
    );

COMMENT ON TABLE sender_ids IS 'Alphanumeric SMS sender IDs, owned per customer and globally unique (migration 020).';
