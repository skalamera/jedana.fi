-- Create portfolios table for multiple portfolio support
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Create portfolio_assets table to link assets to portfolios
CREATE TABLE IF NOT EXISTS portfolio_assets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('crypto', 'equity', 'manual', 'cash')),
    quantity DECIMAL(20,8) NOT NULL CHECK (quantity > 0),
    cost_basis DECIMAL(20,8) NOT NULL CHECK (cost_basis >= 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(portfolio_id, symbol)
);

-- Update manual_assets to be associated with portfolios (for backward compatibility)
ALTER TABLE manual_assets ADD COLUMN IF NOT EXISTS portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL;

-- Update asset_cost_basis to be associated with portfolios
ALTER TABLE asset_cost_basis ADD COLUMN IF NOT EXISTS portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_is_default ON portfolios(user_id, is_default);
CREATE INDEX IF NOT EXISTS idx_portfolio_assets_portfolio_id ON portfolio_assets(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_assets_symbol ON portfolio_assets(symbol);
CREATE INDEX IF NOT EXISTS idx_manual_assets_portfolio_id ON manual_assets(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_asset_cost_basis_portfolio_id ON asset_cost_basis(portfolio_id);

-- Enable RLS for portfolios
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_assets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can insert own portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can update own portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can delete own portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can view own portfolio assets" ON portfolio_assets;
DROP POLICY IF EXISTS "Users can insert own portfolio assets" ON portfolio_assets;
DROP POLICY IF EXISTS "Users can update own portfolio assets" ON portfolio_assets;
DROP POLICY IF EXISTS "Users can delete own portfolio assets" ON portfolio_assets;

-- RLS Policies for portfolios
CREATE POLICY "Users can view own portfolios" ON portfolios
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolios" ON portfolios
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolios" ON portfolios
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolios" ON portfolios
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for portfolio_assets
CREATE POLICY "Users can view own portfolio assets" ON portfolio_assets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM portfolios
            WHERE portfolios.id = portfolio_assets.portfolio_id
            AND portfolios.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own portfolio assets" ON portfolio_assets
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM portfolios
            WHERE portfolios.id = portfolio_assets.portfolio_id
            AND portfolios.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own portfolio assets" ON portfolio_assets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM portfolios
            WHERE portfolios.id = portfolio_assets.portfolio_id
            AND portfolios.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own portfolio assets" ON portfolio_assets
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM portfolios
            WHERE portfolios.id = portfolio_assets.portfolio_id
            AND portfolios.user_id = auth.uid()
        )
    );

-- Function to ensure only one default portfolio per user
CREATE OR REPLACE FUNCTION ensure_single_default_portfolio()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a portfolio as default, unset all others for this user
    IF NEW.is_default = TRUE THEN
        UPDATE portfolios
        SET is_default = FALSE
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;

    -- Ensure at least one portfolio is default for each user
    IF NOT EXISTS (SELECT 1 FROM portfolios WHERE user_id = NEW.user_id AND is_default = TRUE) THEN
        -- If no default exists, make this one default
        NEW.is_default = TRUE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for default portfolio management
DROP TRIGGER IF EXISTS ensure_single_default_portfolio_trigger ON portfolios;
CREATE TRIGGER ensure_single_default_portfolio_trigger
    BEFORE INSERT OR UPDATE ON portfolios
    FOR EACH ROW EXECUTE FUNCTION ensure_single_default_portfolio();

-- Function to create a default portfolio for new users
CREATE OR REPLACE FUNCTION create_default_portfolio()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO portfolios (user_id, name, description, is_default)
    VALUES (NEW.id, 'My Portfolio', 'Default portfolio', TRUE);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create default portfolio for new users
DROP TRIGGER IF EXISTS create_default_portfolio_trigger ON profiles;
CREATE TRIGGER create_default_portfolio_trigger
    AFTER INSERT ON profiles
    FOR EACH ROW EXECUTE FUNCTION create_default_portfolio();

-- Create trigger for portfolio updated_at
CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_assets_updated_at BEFORE UPDATE ON portfolio_assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
