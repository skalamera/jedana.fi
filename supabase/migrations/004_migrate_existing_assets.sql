-- Migration script to move existing manual assets and cost basis data to portfolios
-- Run this AFTER the main portfolios migration

-- Step 1: Create default portfolios for existing users who don't have one
INSERT INTO portfolios (user_id, name, description, is_default)
SELECT DISTINCT
    ma.user_id,
    'My Portfolio',
    'Migrated from existing assets',
    TRUE
FROM manual_assets ma
LEFT JOIN portfolios p ON ma.user_id = p.user_id
WHERE p.id IS NULL;

-- Step 2: Get the default portfolio IDs for each user
CREATE TEMP TABLE user_default_portfolios AS
SELECT
    p.user_id,
    p.id as portfolio_id
FROM portfolios p
WHERE p.is_default = TRUE;

-- Step 3: Migrate manual assets to portfolio_assets
INSERT INTO portfolio_assets (
    portfolio_id,
    symbol,
    name,
    asset_type,
    quantity,
    cost_basis,
    notes,
    created_at,
    updated_at
)
SELECT
    udp.portfolio_id,
    ma.symbol,
    ma.name,
    ma.asset_type,
    ma.quantity,
    ma.cost_basis,
    'Migrated from manual assets',
    ma.created_at,
    ma.updated_at
FROM manual_assets ma
JOIN user_default_portfolios udp ON ma.user_id = udp.user_id
ON CONFLICT (portfolio_id, symbol) DO NOTHING;

-- Step 4: Migrate cost basis data (using minimal quantity as reference)
INSERT INTO portfolio_assets (
    portfolio_id,
    symbol,
    name,
    asset_type,
    quantity,
    cost_basis,
    notes,
    created_at,
    updated_at
)
SELECT
    udp.portfolio_id,
    acb.symbol,
    CASE
        WHEN acb.symbol LIKE 'X:%' THEN 'Cryptocurrency'
        WHEN acb.symbol LIKE '%.%' THEN 'Stock/ETF'
        ELSE 'Asset'
    END as name,
    acb.asset_type,
    0.00000001 as quantity, -- Minimal quantity to satisfy constraint (cost basis reference only)
    acb.cost_basis,
    COALESCE(acb.notes, '') || ' [Cost Basis Reference - Quantity not tracked]',
    acb.created_at,
    acb.updated_at
FROM asset_cost_basis acb
JOIN user_default_portfolios udp ON acb.user_id = udp.user_id
WHERE NOT EXISTS (
    SELECT 1 FROM portfolio_assets pa
    WHERE pa.portfolio_id = udp.portfolio_id
    AND pa.symbol = acb.symbol
)
ON CONFLICT (portfolio_id, symbol) DO NOTHING;

-- Step 5: Update manual_assets and asset_cost_basis to reference the portfolios
UPDATE manual_assets
SET portfolio_id = udp.portfolio_id
FROM user_default_portfolios udp
WHERE manual_assets.user_id = udp.user_id;

UPDATE asset_cost_basis
SET portfolio_id = udp.portfolio_id
FROM user_default_portfolios udp
WHERE asset_cost_basis.user_id = udp.user_id;

-- Step 6: Clean up temp table
DROP TABLE user_default_portfolios;

-- Optional: If you want to remove the old manual_assets table after migration
-- (Uncomment these lines only after verifying the migration worked correctly)
-- DROP TABLE manual_assets;
-- DROP TABLE asset_cost_basis;
