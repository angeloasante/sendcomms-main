-- Add Stripe customer ID to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE;

-- Add Stripe subscription ID to subscriptions table  
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

-- Add Stripe invoice ID to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS stripe_invoice_id VARCHAR(255);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customers_stripe ON customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe ON invoices(stripe_invoice_id);

-- Comment
COMMENT ON COLUMN customers.stripe_customer_id IS 'Stripe Customer ID for payment processing';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe Subscription ID';
COMMENT ON COLUMN invoices.stripe_invoice_id IS 'Stripe Invoice ID';
