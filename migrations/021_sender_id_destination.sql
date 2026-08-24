-- Migration 021: record WHERE a sender ID will be used, and therefore WHICH
-- carrier it had to be registered with.
--
-- Sender IDs are not global: each carrier keeps its own approved list. A name
-- approved for Ghana is unknown to the international carrier and vice versa, so
-- we must know the destination market at registration time to send the request
-- to the right provider - and to tell the customer where it is actually usable.

ALTER TABLE sender_ids
    ADD COLUMN IF NOT EXISTS destination_code TEXT,      -- dialing code, e.g. '233', or 'international'
    ADD COLUMN IF NOT EXISTS destination_label TEXT;     -- human name shown in the dashboard

-- Existing rows were registered before this existed; they were all submitted to
-- BMS, which only covers Ghana for us.
UPDATE sender_ids
   SET destination_code = '233', destination_label = 'Ghana'
 WHERE destination_code IS NULL;

CREATE INDEX IF NOT EXISTS idx_sender_ids_destination ON sender_ids(destination_code);

COMMENT ON COLUMN sender_ids.destination_code IS 'Dialing code of the market this sender ID is registered for (233 = Ghana), or ''international''.';
COMMENT ON COLUMN sender_ids.provider IS 'Which carrier this sender ID was registered with, derived from destination_code.';
