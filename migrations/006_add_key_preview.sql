-- Migration: Add key_preview column to api_keys table
-- This column stores a truncated version of the API key for display purposes
-- Format: "sc_live_xxxx...yyyy" (first 12 chars + ... + last 4 chars)

-- Add key_preview column if it doesn't exist
ALTER TABLE api_keys 
ADD COLUMN IF NOT EXISTS key_preview VARCHAR(30);

-- Update existing keys to have a preview based on their key_hash
-- This is a one-time migration for existing keys
UPDATE api_keys 
SET key_preview = CONCAT(
  LEFT(key_hash, 12), 
  '...', 
  RIGHT(key_hash, 4)
)
WHERE key_preview IS NULL;

-- Add comment
COMMENT ON COLUMN api_keys.key_preview IS 'Truncated version of API key for display (sc_live_xxxx...yyyy)';
