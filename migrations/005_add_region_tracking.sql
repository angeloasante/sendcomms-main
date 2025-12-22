-- Add country/region tracking to transactions
-- Run this in your Supabase SQL Editor

-- Add country column to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS country VARCHAR(2),
ADD COLUMN IF NOT EXISTS region VARCHAR(50);

-- Create index for region queries
CREATE INDEX IF NOT EXISTS idx_transactions_region ON transactions(region);
CREATE INDEX IF NOT EXISTS idx_transactions_country ON transactions(country);

-- Comment for documentation
COMMENT ON COLUMN transactions.country IS 'ISO 2-letter country code (e.g., NG, KE, ZA)';
COMMENT ON COLUMN transactions.region IS 'African region: West Africa, East Africa, North Africa, South Africa, Central Africa';
