-- =====================================================
-- VERIFICATION QUERY: Customer Identity Fields
-- =====================================================
-- Verify that drivers_id, emirates_id, and is_tourist
-- columns exist and are properly configured
-- =====================================================

-- 1. Check column structure
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'customers'
AND column_name IN ('drivers_id', 'emirates_id', 'is_tourist', 'id_type', 'id_number', 'license_number')
ORDER BY ordinal_position;

-- 2. Check indexes
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'customers'
AND indexname IN ('idx_customers_drivers_id', 'idx_customers_emirates_id', 'idx_customers_is_tourist')
ORDER BY indexname;

-- 3. Sample query to test field usage
-- This would show how to query tourists vs residents
SELECT
    id,
    first_name,
    last_name,
    email,
    nationality,
    id_type,
    id_number,
    license_number,
    drivers_id,
    emirates_id,
    is_tourist,
    CASE
        WHEN is_tourist = TRUE THEN 'Tourist (Passport Holder)'
        WHEN is_tourist = FALSE THEN 'UAE Resident'
        ELSE 'Unknown'
    END as customer_type
FROM customers
LIMIT 5;

-- 4. Count customers by type
SELECT
    CASE
        WHEN is_tourist = TRUE THEN 'Tourists'
        WHEN is_tourist = FALSE THEN 'Residents'
        ELSE 'Not Specified'
    END as customer_type,
    COUNT(*) as count
FROM customers
GROUP BY is_tourist
ORDER BY count DESC;

-- =====================================================
-- EXPECTED RESULTS:
-- =====================================================
-- 1. All three new columns should exist with correct data types
-- 2. All three indexes should exist
-- 3. Sample query should show customers with new fields
-- 4. Count query should categorize customers by type
-- =====================================================
