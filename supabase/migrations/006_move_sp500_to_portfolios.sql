-- Move S&P 500 starting price and chart start date from profiles to portfolios table
-- This makes these settings portfolio-specific instead of profile-wide

-- Add columns to portfolios table
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS sp500_starting_price DECIMAL(20,2);
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS portfolio_chart_start_date TEXT;

-- Add comments for documentation
COMMENT ON COLUMN portfolios.sp500_starting_price IS 'Starting S&P 500 index price for this portfolio performance comparison';
COMMENT ON COLUMN portfolios.portfolio_chart_start_date IS 'Start date for portfolio chart (7d, 30d, 90d, 1y, all)';

-- Migrate existing data from profiles to default portfolios
UPDATE portfolios p
SET 
    sp500_starting_price = pr.sp500_starting_price,
    portfolio_chart_start_date = pr.portfolio_chart_start_date
FROM profiles pr
WHERE p.user_id = pr.id
    AND p.is_default = TRUE
    AND (pr.sp500_starting_price IS NOT NULL OR pr.portfolio_chart_start_date IS NOT NULL);

-- Optional: Remove columns from profiles table (commented out for safety)
-- ALTER TABLE profiles DROP COLUMN IF EXISTS sp500_starting_price;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS portfolio_chart_start_date;

