-- Migration: Add auth_user_id column to customers table
-- This links customers to Supabase Auth users

-- Add auth_user_id column if it doesn't exist
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_auth_user_id ON customers(auth_user_id);

-- Add foreign key constraint to auth.users (optional - may need adjustment based on your setup)
-- Note: This assumes Supabase auth is being used
-- ALTER TABLE customers ADD CONSTRAINT fk_customers_auth_user 
-- FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN customers.auth_user_id IS 'References the Supabase Auth user ID';
