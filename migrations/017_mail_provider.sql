-- Migration 017: make customer_domains provider-agnostic (Resend -> Inboxi)
--
-- Domains used to be identified by Resend's UUID (`resend_domain_id`). Our own
-- mail server (Inboxi) identifies a domain by its NAME, so the provider id is
-- now just the domain. Adds a provider column so a future switch is a data
-- change, not a schema change.
--
-- `resend_domain_id` is intentionally KEPT (nullable) for now: the old Vercel
-- deployment still reads it. Drop it after the cutover with:
--     ALTER TABLE customer_domains DROP COLUMN resend_domain_id;

ALTER TABLE customer_domains
    ADD COLUMN IF NOT EXISTS mail_provider TEXT NOT NULL DEFAULT 'inboxi',
    ADD COLUMN IF NOT EXISTS provider_domain_id TEXT,
    ADD COLUMN IF NOT EXISTS dkim_selector TEXT;

-- Existing rows were provisioned on Resend and must be re-onboarded (their DNS
-- still carries Resend's DKIM record, which our MTA cannot sign with).
UPDATE customer_domains
   SET mail_provider = 'resend'
 WHERE resend_domain_id IS NOT NULL
   AND provider_domain_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_customer_domains_provider
    ON customer_domains(mail_provider, status);

COMMENT ON COLUMN customer_domains.mail_provider IS 'Which mail provider provisioned this domain: inboxi (current) or resend (legacy, needs re-onboarding).';
COMMENT ON COLUMN customer_domains.provider_domain_id IS 'Provider-side identifier. For Inboxi this is the domain name itself.';
COMMENT ON COLUMN customer_domains.dkim_selector IS 'DKIM selector issued for this domain (Inboxi send-only domains default to scomms).';
