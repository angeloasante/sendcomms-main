-- Data Packages table to store provider prices and our markup
CREATE TABLE IF NOT EXISTS data_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL DEFAULT 'datamart',
  country VARCHAR(50) NOT NULL DEFAULT 'Ghana',
  country_code VARCHAR(5) NOT NULL DEFAULT 'GH',
  network VARCHAR(50) NOT NULL,
  network_code VARCHAR(50) NOT NULL,
  network_display VARCHAR(100) NOT NULL,
  capacity_gb INTEGER NOT NULL,
  capacity_mb INTEGER NOT NULL,
  provider_price DECIMAL(10, 2) NOT NULL,
  our_price DECIMAL(10, 2) NOT NULL,
  margin_percent DECIMAL(5, 2) NOT NULL DEFAULT 15.00,
  margin_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(5) NOT NULL DEFAULT 'GHS',
  in_stock BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, network_code, capacity_gb)
);

-- Pricing settings table
CREATE TABLE IF NOT EXISTS pricing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type VARCHAR(50) NOT NULL UNIQUE,
  default_margin_percent DECIMAL(5, 2) NOT NULL DEFAULT 15.00,
  min_margin_percent DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
  max_margin_percent DECIMAL(5, 2) NOT NULL DEFAULT 50.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pricing settings
INSERT INTO pricing_settings (service_type, default_margin_percent, min_margin_percent, max_margin_percent)
VALUES 
  ('data', 15.00, 5.00, 50.00),
  ('airtime', 3.00, 1.00, 10.00),
  ('sms', 75.00, 50.00, 200.00),
  ('email', 150.00, 100.00, 300.00)
ON CONFLICT (service_type) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_packages_network ON data_packages(network_code);
CREATE INDEX IF NOT EXISTS idx_data_packages_provider ON data_packages(provider);
CREATE INDEX IF NOT EXISTS idx_data_packages_country ON data_packages(country_code);
CREATE INDEX IF NOT EXISTS idx_data_packages_capacity ON data_packages(capacity_gb);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_data_packages_updated_at ON data_packages;
CREATE TRIGGER update_data_packages_updated_at
  BEFORE UPDATE ON data_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pricing_settings_updated_at ON pricing_settings;
CREATE TRIGGER update_pricing_settings_updated_at
  BEFORE UPDATE ON pricing_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE data_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read for data_packages (customers can see prices)
CREATE POLICY "Allow public read for data_packages"
  ON data_packages FOR SELECT
  USING (true);

-- Only service role can modify data_packages
CREATE POLICY "Service role can manage data_packages"
  ON data_packages FOR ALL
  USING (auth.role() = 'service_role');

-- Only service role can read/modify pricing_settings
CREATE POLICY "Service role can manage pricing_settings"
  ON pricing_settings FOR ALL
  USING (auth.role() = 'service_role');
