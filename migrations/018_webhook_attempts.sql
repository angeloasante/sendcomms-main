-- Migration 018: record how many delivery attempts a customer webhook took.
-- Outbound customer webhooks now retry with backoff (1s, 4s, 10s) on transport
-- failures, 5xx, 408 and 429. Without this column the enriched log row would be
-- rejected and the delivery record lost entirely.

ALTER TABLE webhook_logs
    ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN webhook_logs.attempts IS 'Number of delivery attempts made (1 = succeeded or rejected first try).';
