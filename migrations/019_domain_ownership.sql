-- Migration 019: one owner per domain, enforced in the database.
--
-- The mail server is single-tenant: every customer's sending domains live in one
-- account there. If two SendComms customers could both hold the same domain, the
-- second would verify instantly off the first customer's DKIM record and could
-- then send as that domain. Ownership must be globally unique, not per-account.
--
-- The application checks this before insert; this index closes the race between
-- two concurrent adds.

CREATE UNIQUE INDEX IF NOT EXISTS uniq_customer_domains_active_name
    ON customer_domains (name)
    WHERE is_active;

COMMENT ON INDEX uniq_customer_domains_active_name IS
    'A domain may be actively held by only one customer at a time (see migration 019).';
