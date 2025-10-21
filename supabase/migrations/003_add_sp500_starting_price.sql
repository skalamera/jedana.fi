-- Add starting S&P 500 price to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sp500_starting_price DECIMAL(20,2);

-- Add comment to document the column
COMMENT ON COLUMN profiles.sp500_starting_price IS 'Starting S&P 500 index price for portfolio performance comparison';

