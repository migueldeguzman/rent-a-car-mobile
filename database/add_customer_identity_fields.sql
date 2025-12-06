-- =====================================================
-- MIGRATION: Add Identity Fields to Customers Table
-- =====================================================
-- Adds drivers_id, emirates_id, and is_tourist fields
-- to support tourist/resident identification
-- =====================================================

-- Add new columns to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS drivers_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS emirates_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_tourist BOOLEAN DEFAULT FALSE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_drivers_id ON customers(drivers_id);
CREATE INDEX IF NOT EXISTS idx_customers_emirates_id ON customers(emirates_id);
CREATE INDEX IF NOT EXISTS idx_customers_is_tourist ON customers(is_tourist);

-- Add comments for documentation
COMMENT ON COLUMN customers.drivers_id IS 'Driver License ID/Number - for both tourists and residents';
COMMENT ON COLUMN customers.emirates_id IS 'Emirates ID Number - only for UAE residents';
COMMENT ON COLUMN customers.is_tourist IS 'TRUE if customer is a tourist (passport holder), FALSE if UAE resident';

-- =====================================================
-- MIGRATION NOTES:
-- =====================================================
-- 1. drivers_id: Stores the driver's license ID (required for all customers)
-- 2. emirates_id: Stores Emirates ID (only for UAE residents, NULL for tourists)
-- 3. is_tourist: Boolean flag to distinguish tourists from residents
--
-- Usage:
-- - Tourists: drivers_id = license number, emirates_id = NULL, is_tourist = TRUE
-- - Residents: drivers_id = license number, emirates_id = EID number, is_tourist = FALSE
--
-- This schema maintains backward compatibility with existing customers table
-- All new columns are nullable to avoid breaking existing data
-- =====================================================
