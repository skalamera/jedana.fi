-- Remove "Migrated from existing assets" description from portfolios
UPDATE portfolios
SET description = NULL
WHERE description = 'Migrated from existing assets';

