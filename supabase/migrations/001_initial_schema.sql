-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create API keys table for storing Kraken credentials securely
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    kraken_api_key TEXT NOT NULL,
    kraken_api_secret TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create manual assets table for user-added assets
CREATE TABLE IF NOT EXISTS manual_assets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity DECIMAL(20,8) NOT NULL CHECK (quantity > 0),
    cost_basis DECIMAL(20,8) NOT NULL CHECK (cost_basis >= 0), -- Total amount paid for this asset
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create asset cost basis table for tracking cost basis of any asset
CREATE TABLE IF NOT EXISTS asset_cost_basis (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('crypto', 'equity', 'manual')),
    cost_basis DECIMAL(20,8) NOT NULL CHECK (cost_basis >= 0), -- Total amount paid for this asset
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, symbol, asset_type)
);

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_assets_user_id ON manual_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_assets_symbol ON manual_assets(symbol);
CREATE INDEX IF NOT EXISTS idx_asset_cost_basis_user_id ON asset_cost_basis(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_cost_basis_symbol ON asset_cost_basis(symbol);

-- Enable Row Level Security (RLS) - only if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'profiles' AND c.relrowsecurity = true) THEN
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'api_keys' AND c.relrowsecurity = true) THEN
        ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'manual_assets' AND c.relrowsecurity = true) THEN
        ALTER TABLE manual_assets ENABLE ROW LEVEL SECURITY;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'asset_cost_basis' AND c.relrowsecurity = true) THEN
        ALTER TABLE asset_cost_basis ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can insert own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can update own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can delete own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can view own manual assets" ON manual_assets;
DROP POLICY IF EXISTS "Users can insert own manual assets" ON manual_assets;
DROP POLICY IF EXISTS "Users can update own manual assets" ON manual_assets;
DROP POLICY IF EXISTS "Users can delete own manual assets" ON manual_assets;
DROP POLICY IF EXISTS "Users can view own asset cost basis" ON asset_cost_basis;
DROP POLICY IF EXISTS "Users can insert own asset cost basis" ON asset_cost_basis;
DROP POLICY IF EXISTS "Users can update own asset cost basis" ON asset_cost_basis;
DROP POLICY IF EXISTS "Users can delete own asset cost basis" ON asset_cost_basis;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for api_keys
CREATE POLICY "Users can view own API keys" ON api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API keys" ON api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys" ON api_keys
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys" ON api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for manual_assets
CREATE POLICY "Users can view own manual assets" ON manual_assets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own manual assets" ON manual_assets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own manual assets" ON manual_assets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own manual assets" ON manual_assets
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for asset_cost_basis
CREATE POLICY "Users can view own asset cost basis" ON asset_cost_basis
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own asset cost basis" ON asset_cost_basis
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own asset cost basis" ON asset_cost_basis
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own asset cost basis" ON asset_cost_basis
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
DROP TRIGGER IF EXISTS update_manual_assets_updated_at ON manual_assets;
DROP TRIGGER IF EXISTS update_asset_cost_basis_updated_at ON asset_cost_basis;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manual_assets_updated_at BEFORE UPDATE ON manual_assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asset_cost_basis_updated_at BEFORE UPDATE ON asset_cost_basis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
