-- transactions.country was varchar(2), i.e. sized for an ISO alpha-2 code.
-- The SMS send path writes the DIALING code instead ("233", "254", "234"), so
-- every insert for a country with a 3-digit dialing code failed with 22001.
-- Because the write goes through safe_insert, which logs and swallows, the API
-- still answered 200 and the transaction row was silently lost. Only 1- and
-- 2-digit codes (UK "44", US "1") ever persisted, so no African SMS has ever
-- recorded a transaction: no billing row, no delivery reconciliation target,
-- and nothing in the customer's history.
--
-- Widening rather than converting to alpha-2: the airtime path already stores a
-- validated alpha-2 here and both must keep fitting. 8 chars covers every
-- dialing code with room to spare.

ALTER TABLE transactions
  ALTER COLUMN country TYPE varchar(8);

COMMENT ON COLUMN transactions.country IS
  'Dialing code for sms (e.g. 233), ISO alpha-2 for airtime (e.g. GH). Widened in 023.';
