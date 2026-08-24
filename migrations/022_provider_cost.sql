-- Migration 022: record what a send actually cost at the provider.
--
-- BMS has no pricing endpoint, but every campaign response reports what it
-- consumed. Capturing that per transaction gives us real observed cost per
-- destination instead of a rate table that goes stale silently - and it is the
-- only way to reconcile what we charge against what we are actually billed.
--
-- BMS keeps two separate purses: SMS credits (Ghana domestic) and a GHS wallet
-- (other destinations). Which one a send draws on tells us how that route bills.

ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS provider_credits_used NUMERIC(12, 4),
    ADD COLUMN IF NOT EXISTS provider_wallet_used  NUMERIC(12, 4),
    ADD COLUMN IF NOT EXISTS provider_balance_after NUMERIC(14, 2);

-- Only rows that actually carry provider cost data are interesting here.
CREATE INDEX IF NOT EXISTS idx_transactions_provider_cost
    ON transactions (provider, created_at DESC)
    WHERE provider_credits_used IS NOT NULL OR provider_wallet_used IS NOT NULL;

COMMENT ON COLUMN transactions.provider_credits_used IS 'Provider credits consumed by this send, as reported by the provider (BMS: summary.credit_used).';
COMMENT ON COLUMN transactions.provider_wallet_used IS 'Provider wallet currency consumed by this send (BMS: summary.wallet_used, GHS).';
COMMENT ON COLUMN transactions.provider_balance_after IS 'Provider balance remaining after the send, for drift detection (BMS: summary.credit_left).';
